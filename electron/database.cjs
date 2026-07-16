const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const initSqlJs = require('sql.js')
const {
  ACHIEVEMENTS,
  focusXp,
  completionXp,
  levelFromXp,
  secondsWithinRange,
  localDateKey,
  dayBounds,
  weekBounds,
} = require('./domain.cjs')
const {
  COMPANION_SPECIES,
  LOOT,
  rollExpedition,
  companionStage,
  evolutionReady,
} = require('./game.cjs')

class StudyDatabase {
  constructor(dataDir) {
    this.dataDir = dataDir
    this.filePath = path.join(dataDir, 'growth-arc.sqlite')
    this.db = null
  }

  async init() {
    fs.mkdirSync(this.dataDir, { recursive: true })
    const wasmBinary = fs.readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'))
    const SQL = await initSqlJs({ wasmBinary })
    const existing = fs.existsSync(this.filePath) ? fs.readFileSync(this.filePath) : undefined
    this.db = existing ? new SQL.Database(existing) : new SQL.Database()
    this.db.run('PRAGMA foreign_keys = ON;')
    this.migrate()
    this.seed()
    this.recoverStaleSession()
    return this
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS areas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'book',
        archived INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        area_id TEXT NOT NULL REFERENCES areas(id),
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        area_id TEXT NOT NULL REFERENCES areas(id),
        goal_id TEXT REFERENCES goals(id),
        title TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'todo',
        completed_at INTEGER,
        completion_xp_awarded INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS focus_sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT REFERENCES tasks(id),
        area_id TEXT REFERENCES areas(id),
        content TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        status TEXT NOT NULL,
        last_heartbeat_at INTEGER NOT NULL,
        active_seconds INTEGER NOT NULL DEFAULT 0,
        outcome TEXT NOT NULL DEFAULT '',
        blocker TEXT NOT NULL DEFAULT '',
        next_step TEXT NOT NULL DEFAULT '',
        task_completed INTEGER NOT NULL DEFAULT 0,
        long_notified INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS focus_intervals (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
        started_at INTEGER NOT NULL,
        ended_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS daily_reviews (
        review_date TEXT PRIMARY KEY,
        win TEXT NOT NULL DEFAULT '',
        blocker TEXT NOT NULL DEFAULT '',
        energy INTEGER,
        tomorrow_task TEXT NOT NULL DEFAULT '',
        ai_json TEXT,
        ai_model TEXT,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS weekly_reports (
        week_start TEXT PRIMARY KEY,
        stats_json TEXT NOT NULL,
        ai_json TEXT,
        ai_model TEXT,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS xp_transactions (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        amount INTEGER NOT NULL,
        reference_type TEXT NOT NULL,
        reference_id TEXT NOT NULL,
        label TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(kind, reference_id)
      );
      CREATE TABLE IF NOT EXISTS achievement_unlocks (
        code TEXT PRIMARY KEY,
        unlocked_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS companions (
        id TEXT PRIMARY KEY,
        species_id TEXT NOT NULL UNIQUE,
        nickname TEXT NOT NULL,
        bond_xp INTEGER NOT NULL DEFAULT 0,
        stage INTEGER NOT NULL DEFAULT 0,
        evolution_path TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 0,
        met_at INTEGER NOT NULL,
        last_adventure_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS inventory (
        item_id TEXT PRIMARY KEY,
        quantity INTEGER NOT NULL DEFAULT 0,
        first_found_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS expeditions (
        session_id TEXT PRIMARY KEY REFERENCES focus_sessions(id) ON DELETE CASCADE,
        tier_id TEXT NOT NULL,
        location TEXT NOT NULL,
        event_text TEXT NOT NULL,
        rewards_json TEXT NOT NULL,
        rare_found INTEGER NOT NULL DEFAULT 0,
        companion_found_id TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS knowledge_relics (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE REFERENCES focus_sessions(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        question TEXT NOT NULL DEFAULT '',
        next_step TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_area ON tasks(area_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_started ON focus_sessions(started_at);
      CREATE INDEX IF NOT EXISTS idx_intervals_session ON focus_intervals(session_id);
      CREATE INDEX IF NOT EXISTS idx_companions_active ON companions(is_active);
      CREATE INDEX IF NOT EXISTS idx_relics_created ON knowledge_relics(created_at);
    `)
    const sessionColumns = new Set(this.all('PRAGMA table_info(focus_sessions)').map((column) => column.name))
    if (!sessionColumns.has('companion_id')) this.db.run('ALTER TABLE focus_sessions ADD COLUMN companion_id TEXT')
    if (!sessionColumns.has('planned_seconds')) this.db.run('ALTER TABLE focus_sessions ADD COLUMN planned_seconds INTEGER NOT NULL DEFAULT 1500')
    this.save()
  }

  seed() {
    const now = Date.now()
    if (!this.one('SELECT id FROM areas LIMIT 1')) {
      this.run('INSERT INTO areas (id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?)', [
        crypto.randomUUID(), '通用学习', '#79c0ff', 'book', now,
      ], false)
    }
    const defaults = {
      user_name: '学习者',
      model: 'gpt-5.6-luna',
      theme: 'hearth',
      accent: '#c9783d',
      world_name: '炉火营地',
      rare_pity: '0',
      companion_pity: '0',
    }
    for (const [key, value] of Object.entries(defaults)) {
      this.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value], false)
    }
    if (!this.one('SELECT id FROM companions LIMIT 1')) {
      this.run("INSERT INTO companions (id, species_id, nickname, is_active, met_at) VALUES (?, 'hearth_hound', '栗子', 1, ?)", [crypto.randomUUID(), now], false)
    }
    this.save()
  }

  save() {
    const bytes = this.db.export()
    const temp = `${this.filePath}.tmp`
    fs.writeFileSync(temp, Buffer.from(bytes))
    fs.copyFileSync(temp, this.filePath)
    fs.unlinkSync(temp)
  }

  all(sql, params = []) {
    const statement = this.db.prepare(sql)
    statement.bind(params)
    const rows = []
    while (statement.step()) rows.push(statement.getAsObject())
    statement.free()
    return rows
  }

  one(sql, params = []) {
    return this.all(sql, params)[0] || null
  }

  run(sql, params = [], persist = true) {
    this.db.run(sql, params)
    if (persist) this.save()
  }

  transaction(callback) {
    this.db.run('BEGIN')
    try {
      const result = callback()
      this.db.run('COMMIT')
      this.save()
      return result
    } catch (error) {
      this.db.run('ROLLBACK')
      throw error
    }
  }

  getSettings() {
    const values = Object.fromEntries(this.all('SELECT key, value FROM settings').map((row) => [row.key, row.value]))
    return values
  }

  setSettings(values) {
    this.transaction(() => {
      for (const [key, value] of Object.entries(values)) {
        if (!['user_name', 'model', 'theme', 'accent', 'world_name', 'birthday'].includes(key)) continue
        this.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)], false)
      }
    })
    return this.getSettings()
  }

  getStructure() {
    return {
      areas: this.all('SELECT * FROM areas WHERE archived = 0 ORDER BY created_at'),
      goals: this.all("SELECT * FROM goals WHERE status != 'archived' ORDER BY created_at DESC"),
      tasks: this.all("SELECT * FROM tasks WHERE status != 'archived' ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END, created_at DESC"),
    }
  }

  createArea({ name, color = '#8b9cff', icon = 'book' }) {
    const id = crypto.randomUUID()
    const clean = String(name || '').trim()
    if (!clean) throw new Error('领域名称不能为空')
    this.run('INSERT INTO areas (id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?)', [id, clean, color, icon, Date.now()])
    return this.one('SELECT * FROM areas WHERE id = ?', [id])
  }

  createGoal({ areaId, title, description = '', dueDate = null }) {
    const id = crypto.randomUUID()
    const now = Date.now()
    if (!this.one('SELECT id FROM areas WHERE id = ?', [areaId])) throw new Error('请选择有效领域')
    if (!String(title || '').trim()) throw new Error('目标名称不能为空')
    this.run('INSERT INTO goals (id, area_id, title, description, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      id, areaId, title.trim(), String(description || '').trim(), dueDate || null, now, now,
    ])
    return this.one('SELECT * FROM goals WHERE id = ?', [id])
  }

  createTask({ areaId, goalId = null, title, notes = '' }) {
    const id = crypto.randomUUID()
    const now = Date.now()
    if (!this.one('SELECT id FROM areas WHERE id = ?', [areaId])) throw new Error('请选择有效领域')
    if (goalId && !this.one('SELECT id FROM goals WHERE id = ?', [goalId])) throw new Error('目标不存在')
    if (!String(title || '').trim()) throw new Error('事项名称不能为空')
    this.run('INSERT INTO tasks (id, area_id, goal_id, title, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      id, areaId, goalId || null, title.trim(), String(notes || '').trim(), now, now,
    ])
    return this.one('SELECT * FROM tasks WHERE id = ?', [id])
  }

  updateTask(id, patch) {
    const task = this.one('SELECT * FROM tasks WHERE id = ?', [id])
    if (!task) throw new Error('事项不存在')
    const status = patch.status ?? task.status
    const title = String(patch.title ?? task.title).trim()
    if (!title) throw new Error('事项名称不能为空')
    const now = Date.now()
    this.transaction(() => {
      this.run(`UPDATE tasks SET title = ?, notes = ?, area_id = ?, goal_id = ?, status = ?, completed_at = ?, updated_at = ? WHERE id = ?`, [
        title,
        patch.notes ?? task.notes,
        patch.areaId ?? task.area_id,
        patch.goalId === undefined ? task.goal_id : (patch.goalId || null),
        status,
        status === 'done' ? (task.completed_at || now) : null,
        now,
        id,
      ], false)
      if (status === 'done' && !task.completion_xp_awarded) this.awardTaskCompletion(id, false)
    })
    const unlocked = this.checkAchievements()
    return { task: this.one('SELECT * FROM tasks WHERE id = ?', [id]), unlocked }
  }

  archiveGoal(id) {
    this.run("UPDATE goals SET status = 'archived', updated_at = ? WHERE id = ?", [Date.now(), id])
  }

  archiveArea(id) {
    const areaCount = Number(this.one('SELECT COUNT(*) AS count FROM areas WHERE archived = 0').count)
    if (areaCount <= 1) throw new Error('至少保留一个学习领域')
    this.run('UPDATE areas SET archived = 1 WHERE id = ?', [id])
  }

  getActiveSession() {
    const session = this.one(`SELECT s.*, t.title AS task_title, a.name AS area_name, a.color AS area_color,
        c.nickname AS companion_name, c.species_id AS companion_species_id
      FROM focus_sessions s
      LEFT JOIN tasks t ON t.id = s.task_id
      LEFT JOIN areas a ON a.id = s.area_id
      LEFT JOIN companions c ON c.id = s.companion_id
      WHERE s.status IN ('running', 'paused') ORDER BY s.started_at DESC LIMIT 1`)
    if (!session) return null
    return { ...session, active_seconds: this.sessionActiveSeconds(session.id) }
  }

  startSession({ taskId = null, areaId = null, content = '', companionId = null, plannedMinutes = 25 }) {
    if (this.getActiveSession()) throw new Error('已有进行中的专注')
    let task = null
    if (taskId) task = this.one('SELECT * FROM tasks WHERE id = ?', [taskId])
    const resolvedArea = task?.area_id || areaId || null
    const resolvedContent = String(task?.title || content || '').trim()
    if (!resolvedContent) throw new Error('请输入本次专注内容')
    if (!resolvedArea) throw new Error('请选择学习领域')
    const companion = companionId
      ? this.one('SELECT * FROM companions WHERE id = ?', [companionId])
      : this.one('SELECT * FROM companions WHERE is_active = 1 ORDER BY met_at LIMIT 1')
    if (companionId && !companion) throw new Error('同行伙伴不存在')
    const plannedSeconds = Math.max(5, Math.min(90, Number(plannedMinutes) || 25)) * 60
    const id = crypto.randomUUID()
    const intervalId = crypto.randomUUID()
    const now = Date.now()
    this.transaction(() => {
      this.run(`INSERT INTO focus_sessions (id, task_id, area_id, content, companion_id, planned_seconds, started_at, status, last_heartbeat_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?, ?)`, [id, taskId || null, resolvedArea, resolvedContent, companion?.id || null, plannedSeconds, now, now, now], false)
      this.run('INSERT INTO focus_intervals (id, session_id, started_at) VALUES (?, ?, ?)', [intervalId, id, now], false)
      if (task && task.status === 'todo') this.run("UPDATE tasks SET status = 'doing', updated_at = ? WHERE id = ?", [now, task.id], false)
    })
    return this.getActiveSession()
  }

  heartbeat(id) {
    const session = this.one("SELECT * FROM focus_sessions WHERE id = ? AND status = 'running'", [id])
    if (!session) return this.getActiveSession()
    this.run('UPDATE focus_sessions SET last_heartbeat_at = ? WHERE id = ?', [Date.now(), id])
    return this.getActiveSession()
  }

  pauseSession(id, at = Date.now()) {
    const session = this.one("SELECT * FROM focus_sessions WHERE id = ? AND status = 'running'", [id])
    if (!session) return this.getActiveSession()
    this.transaction(() => {
      this.run('UPDATE focus_intervals SET ended_at = ? WHERE session_id = ? AND ended_at IS NULL', [at, id], false)
      this.run("UPDATE focus_sessions SET status = 'paused', last_heartbeat_at = ? WHERE id = ?", [at, id], false)
    })
    return this.getActiveSession()
  }

  resumeSession(id) {
    const session = this.one("SELECT * FROM focus_sessions WHERE id = ? AND status = 'paused'", [id])
    if (!session) return this.getActiveSession()
    const now = Date.now()
    this.transaction(() => {
      this.run('INSERT INTO focus_intervals (id, session_id, started_at) VALUES (?, ?, ?)', [crypto.randomUUID(), id, now], false)
      this.run("UPDATE focus_sessions SET status = 'running', last_heartbeat_at = ? WHERE id = ?", [now, id], false)
    })
    return this.getActiveSession()
  }

  cancelSession(id) {
    const now = Date.now()
    this.transaction(() => {
      this.run('UPDATE focus_intervals SET ended_at = ? WHERE session_id = ? AND ended_at IS NULL', [now, id], false)
      this.run("UPDATE focus_sessions SET status = 'cancelled', ended_at = ?, active_seconds = ? WHERE id = ?", [now, this.sessionActiveSeconds(id, now), id], false)
    })
    return null
  }

  stopSession(id, { outcome = '', blocker = '', nextStep = '', taskCompleted = false } = {}) {
    const session = this.one("SELECT * FROM focus_sessions WHERE id = ? AND status IN ('running', 'paused')", [id])
    if (!session) throw new Error('没有可结束的专注')
    const now = Date.now()
    let xpAwarded = 0
    let expedition = null
    this.transaction(() => {
      this.run('UPDATE focus_intervals SET ended_at = ? WHERE session_id = ? AND ended_at IS NULL', [now, id], false)
      const activeSeconds = this.sessionActiveSeconds(id, now)
      this.run(`UPDATE focus_sessions SET status = 'completed', ended_at = ?, active_seconds = ?, outcome = ?, blocker = ?, next_step = ?, task_completed = ? WHERE id = ?`, [
        now, activeSeconds, String(outcome || '').trim(), String(blocker || '').trim(), String(nextStep || '').trim(), taskCompleted ? 1 : 0, id,
      ], false)
      xpAwarded = focusXp(activeSeconds)
      if (xpAwarded > 0) {
        this.insertXp('focus', xpAwarded, 'session', id, `专注 ${Math.round(activeSeconds / 60)} 分钟`, false)
      }
      if (taskCompleted && session.task_id) {
        const task = this.one('SELECT * FROM tasks WHERE id = ?', [session.task_id])
        if (task && task.status !== 'done') {
          this.run("UPDATE tasks SET status = 'done', completed_at = ?, updated_at = ? WHERE id = ?", [now, now, task.id], false)
        }
        if (task && !task.completion_xp_awarded) xpAwarded += this.awardTaskCompletion(task.id, false)
      }
      expedition = this.createExpeditionReward({
        sessionId: id,
        activeSeconds,
        companionId: session.companion_id,
        content: session.content,
        outcome,
        blocker,
        nextStep,
        createdAt: now,
      })
    })
    const unlocked = this.checkAchievements()
    return { session: this.one('SELECT * FROM focus_sessions WHERE id = ?', [id]), xpAwarded, unlocked, expedition }
  }

  createExpeditionReward({ sessionId, activeSeconds, companionId, content, outcome, blocker, nextStep, createdAt }) {
    const existing = this.getExpedition(sessionId)
    if (existing) return existing
    const settings = this.getSettings()
    const ownedSpeciesIds = this.all('SELECT species_id FROM companions').map((row) => row.species_id)
    const rolled = rollExpedition({
      sessionId,
      activeSeconds,
      rarePity: Number(settings.rare_pity || 0),
      companionPity: Number(settings.companion_pity || 0),
      ownedSpeciesIds,
    })

    for (const drop of rolled.drops) {
      this.run(`INSERT INTO inventory (item_id, quantity, first_found_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = excluded.updated_at`,
      [drop.item.id, drop.quantity, createdAt, createdAt], false)
    }

    let activeCompanion = null
    if (companionId) {
      const current = this.one('SELECT * FROM companions WHERE id = ?', [companionId])
      if (current) {
        const bondXp = Number(current.bond_xp) + rolled.bondXp
        const stage = companionStage(bondXp, current.evolution_path)
        this.run('UPDATE companions SET bond_xp = ?, stage = ?, last_adventure_at = ? WHERE id = ?', [bondXp, stage, createdAt, companionId], false)
        activeCompanion = this.getCompanion(companionId)
      }
    }

    let newCompanion = null
    if (rolled.companionSpecies) {
      const newId = crypto.randomUUID()
      this.run('INSERT OR IGNORE INTO companions (id, species_id, nickname, met_at, last_adventure_at) VALUES (?, ?, ?, ?, ?)',
        [newId, rolled.companionSpecies.id, rolled.companionSpecies.kind, createdAt, createdAt], false)
      const row = this.one('SELECT * FROM companions WHERE species_id = ?', [rolled.companionSpecies.id])
      newCompanion = row ? this.enrichCompanion(row) : null
    }

    this.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['rare_pity', String(rolled.rareFound ? 0 : Number(settings.rare_pity || 0) + 1)], false)
    const noMoreSpecies = ownedSpeciesIds.length + (newCompanion ? 1 : 0) >= COMPANION_SPECIES.length
    this.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['companion_pity', String(newCompanion || noMoreSpecies ? 0 : Number(settings.companion_pity || 0) + 1)], false)

    const rewards = {
      tier: rolled.tier,
      drops: rolled.drops,
      rareFound: rolled.rareFound,
      rareChance: rolled.rareChance,
      companionChance: rolled.companionChance,
      bondXp: rolled.bondXp,
      activeCompanion,
      newCompanion,
    }
    this.run(`INSERT INTO expeditions (session_id, tier_id, location, event_text, rewards_json, rare_found, companion_found_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
      sessionId,
      rolled.tier.id,
      rolled.location,
      rolled.event,
      JSON.stringify(rewards),
      rolled.rareFound ? 1 : 0,
      newCompanion?.id || null,
      createdAt,
    ], false)

    let knowledgeRelic = null
    const cleanOutcome = String(outcome || '').trim()
    if (cleanOutcome) {
      const relicId = crypto.randomUUID()
      this.run(`INSERT INTO knowledge_relics (id, session_id, title, content, question, next_step, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        relicId,
        sessionId,
        String(content || '本次远征').trim(),
        cleanOutcome,
        String(blocker || '').trim(),
        String(nextStep || '').trim(),
        createdAt,
      ], false)
      knowledgeRelic = this.one('SELECT * FROM knowledge_relics WHERE id = ?', [relicId])
    }
    return { sessionId, location: rolled.location, event: rolled.event, ...rewards, knowledgeRelic }
  }

  getExpedition(sessionId) {
    const row = this.one('SELECT * FROM expeditions WHERE session_id = ?', [sessionId])
    if (!row) return null
    const rewards = JSON.parse(row.rewards_json)
    return {
      sessionId: row.session_id,
      tier: rewards.tier,
      location: row.location,
      event: row.event_text,
      drops: rewards.drops,
      rareFound: Boolean(row.rare_found),
      rareChance: rewards.rareChance,
      companionChance: rewards.companionChance,
      bondXp: rewards.bondXp,
      activeCompanion: rewards.activeCompanion,
      newCompanion: rewards.newCompanion,
      knowledgeRelic: this.one('SELECT * FROM knowledge_relics WHERE session_id = ?', [sessionId]),
      createdAt: row.created_at,
    }
  }

  enrichCompanion(row) {
    const species = COMPANION_SPECIES.find((item) => item.id === row.species_id)
    if (!species) return { ...row, species: null, stageName: '未知伙伴', evolutionReady: false }
    const stage = companionStage(row.bond_xp, row.evolution_path)
    const chosenEvolution = species.evolutions.find((item) => item.id === row.evolution_path)
    return {
      ...row,
      stage,
      species,
      stageName: chosenEvolution?.name || species.stages[stage],
      evolutionReady: evolutionReady(row.bond_xp, row.evolution_path),
      nextBondXp: stage === 0 ? 20 : stage === 1 ? 80 : Number(row.bond_xp),
    }
  }

  getCompanion(id) {
    const row = this.one('SELECT * FROM companions WHERE id = ?', [id])
    return row ? this.enrichCompanion(row) : null
  }

  getCompanionCollection() {
    const owned = this.all('SELECT * FROM companions ORDER BY is_active DESC, met_at').map((row) => this.enrichCompanion(row))
    const ownedSpecies = new Set(owned.map((item) => item.species_id))
    return {
      owned,
      active: owned.find((item) => item.is_active) || owned[0] || null,
      catalog: COMPANION_SPECIES.map((species) => ({ ...species, discovered: ownedSpecies.has(species.id) })),
      total: COMPANION_SPECIES.length,
    }
  }

  setActiveCompanion(id) {
    if (!this.one('SELECT id FROM companions WHERE id = ?', [id])) throw new Error('伙伴不存在')
    this.transaction(() => {
      this.run('UPDATE companions SET is_active = 0', [], false)
      this.run('UPDATE companions SET is_active = 1 WHERE id = ?', [id], false)
    })
    return this.getCompanionCollection()
  }

  evolveCompanion(id, pathId) {
    const companion = this.getCompanion(id)
    if (!companion) throw new Error('伙伴不存在')
    if (!companion.evolutionReady) throw new Error('羁绊尚未达到进化条件')
    const path = companion.species.evolutions.find((item) => item.id === pathId)
    if (!path) throw new Error('进化方向不存在')
    this.run('UPDATE companions SET evolution_path = ?, stage = 2 WHERE id = ?', [pathId, id])
    return this.getCompanion(id)
  }

  getInventory() {
    return this.all('SELECT * FROM inventory WHERE quantity > 0 ORDER BY updated_at DESC').map((row) => ({
      ...row,
      item: LOOT.find((item) => item.id === row.item_id) || { id: row.item_id, name: '未知物品', rarity: 'common', icon: 'box', description: '' },
    }))
  }

  getKnowledgeRelics(limit = 8) {
    return this.all('SELECT * FROM knowledge_relics ORDER BY created_at DESC LIMIT ?', [Math.max(1, Math.min(Number(limit) || 8, 100))])
  }

  getWorldState() {
    const settings = this.getSettings()
    const latest = this.one('SELECT session_id FROM expeditions ORDER BY created_at DESC LIMIT 1')
    return {
      name: settings.world_name || '炉火营地',
      companions: this.getCompanionCollection(),
      inventory: this.getInventory(),
      relics: this.getKnowledgeRelics(6),
      latestExpedition: latest ? this.getExpedition(latest.session_id) : null,
      rarePity: Number(settings.rare_pity || 0),
      companionPity: Number(settings.companion_pity || 0),
    }
  }

  sessionActiveSeconds(id, openEnd = Date.now()) {
    return this.all('SELECT started_at, ended_at FROM focus_intervals WHERE session_id = ?', [id])
      .reduce((sum, row) => sum + Math.max(0, Math.floor(((row.ended_at || openEnd) - row.started_at) / 1000)), 0)
  }

  awardTaskCompletion(taskId, persist = true) {
    const task = this.one('SELECT * FROM tasks WHERE id = ?', [taskId])
    if (!task || task.completion_xp_awarded) return 0
    const total = Number(this.one("SELECT COALESCE(SUM(active_seconds), 0) AS total FROM focus_sessions WHERE task_id = ? AND status = 'completed'", [taskId]).total)
    const amount = completionXp(total)
    this.insertXp('completion', amount, 'task', taskId, `完成：${task.title}`, false)
    this.run('UPDATE tasks SET completion_xp_awarded = 1 WHERE id = ?', [taskId], false)
    if (persist) this.save()
    return amount
  }

  insertXp(kind, amount, referenceType, referenceId, label, persist = true) {
    this.run('INSERT OR IGNORE INTO xp_transactions (id, kind, amount, reference_type, reference_id, label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      crypto.randomUUID(), kind, amount, referenceType, referenceId, label, Date.now(),
    ], persist)
  }

  recoverStaleSession() {
    const session = this.one("SELECT * FROM focus_sessions WHERE status = 'running' ORDER BY started_at DESC LIMIT 1")
    if (!session || Date.now() - session.last_heartbeat_at <= 90000) return
    this.transaction(() => {
      this.run('UPDATE focus_intervals SET ended_at = ? WHERE session_id = ? AND ended_at IS NULL', [session.last_heartbeat_at, session.id], false)
      this.run("UPDATE focus_sessions SET status = 'paused' WHERE id = ?", [session.id], false)
    })
  }

  autoPauseForSuspend() {
    const active = this.getActiveSession()
    if (active?.status === 'running') return this.pauseSession(active.id)
    return active
  }

  getXpSummary() {
    const totalXp = Number(this.one('SELECT COALESCE(SUM(amount), 0) AS total FROM xp_transactions').total)
    return {
      totalXp,
      ...levelFromXp(totalXp),
      recent: this.all('SELECT * FROM xp_transactions ORDER BY created_at DESC LIMIT 8'),
    }
  }

  checkAchievements() {
    const totals = {
      sessions: Number(this.one("SELECT COUNT(*) AS count FROM focus_sessions WHERE status = 'completed' AND active_seconds >= 60").count),
      seconds: Number(this.one("SELECT COALESCE(SUM(active_seconds), 0) AS total FROM focus_sessions WHERE status = 'completed'").total),
      tasks: Number(this.one("SELECT COUNT(*) AS count FROM tasks WHERE status = 'done'").count),
      deep: Number(this.one("SELECT COUNT(*) AS count FROM focus_sessions WHERE status = 'completed' AND active_seconds >= 3600").count),
      areas: Number(this.one("SELECT COUNT(DISTINCT area_id) AS count FROM focus_sessions WHERE status = 'completed'").count),
      reviews: Number(this.one('SELECT COUNT(*) AS count FROM daily_reviews').count),
    }
    const fourteenDaysAgo = Date.now() - 13 * 86400000
    const activeDays = new Set(this.all("SELECT started_at FROM focus_sessions WHERE status = 'completed' AND started_at >= ?", [fourteenDaysAgo]).map((row) => localDateKey(row.started_at))).size
    const shouldUnlock = new Set()
    if (totals.sessions >= 1) shouldUnlock.add('first_focus')
    if (totals.seconds >= 36000) shouldUnlock.add('focus_10h')
    if (totals.seconds >= 180000) shouldUnlock.add('focus_50h')
    if (totals.tasks >= 10) shouldUnlock.add('task_10')
    if (totals.tasks >= 50) shouldUnlock.add('task_50')
    if (totals.deep >= 10) shouldUnlock.add('deep_10')
    if (totals.areas >= 3) shouldUnlock.add('explorer')
    if (totals.reviews >= 7) shouldUnlock.add('reflection_7')
    if (activeDays >= 7) shouldUnlock.add('rhythm_7')
    const existing = new Set(this.all('SELECT code FROM achievement_unlocks').map((row) => row.code))
    const unlocked = [...shouldUnlock].filter((code) => !existing.has(code))
    if (unlocked.length) {
      this.transaction(() => {
        for (const code of unlocked) this.run('INSERT OR IGNORE INTO achievement_unlocks (code, unlocked_at) VALUES (?, ?)', [code, Date.now()], false)
      })
    }
    return unlocked.map((code) => ACHIEVEMENTS.find((item) => item.code === code))
  }

  getAchievements() {
    const unlocks = Object.fromEntries(this.all('SELECT * FROM achievement_unlocks').map((row) => [row.code, row.unlocked_at]))
    return ACHIEVEMENTS.map((item) => ({ ...item, unlockedAt: unlocks[item.code] || null }))
  }

  rangeStats(start, end) {
    const now = Date.now()
    const intervals = this.all(`SELECT i.started_at, i.ended_at, s.area_id, a.name AS area_name, a.color AS area_color
      FROM focus_intervals i
      JOIN focus_sessions s ON s.id = i.session_id
      LEFT JOIN areas a ON a.id = s.area_id
      WHERE s.status IN ('running', 'paused', 'completed') AND i.started_at < ? AND COALESCE(i.ended_at, ?) > ?`, [end, now, start])
    let focusSeconds = 0
    const byArea = new Map()
    const activeDays = new Set()
    for (const interval of intervals) {
      const seconds = secondsWithinRange(interval.started_at, interval.ended_at || now, start, end)
      focusSeconds += seconds
      const key = interval.area_id || 'none'
      const existing = byArea.get(key) || { id: key, name: interval.area_name || '未分类', color: interval.area_color || '#718096', seconds: 0 }
      existing.seconds += seconds
      byArea.set(key, existing)
      if (seconds > 0) {
        let cursor = Math.max(interval.started_at, start)
        const stop = Math.min(interval.ended_at || now, end)
        while (cursor < stop) {
          activeDays.add(localDateKey(cursor))
          const next = dayBounds(localDateKey(cursor)).end
          cursor = Math.min(next, stop)
        }
      }
    }
    const completedTasks = Number(this.one("SELECT COUNT(*) AS count FROM tasks WHERE status = 'done' AND completed_at >= ? AND completed_at < ?", [start, end]).count)
    const sessions = this.all("SELECT active_seconds FROM focus_sessions WHERE status = 'completed' AND ended_at >= ? AND ended_at < ?", [start, end])
    return {
      focusSeconds,
      completedTasks,
      sessionCount: sessions.length,
      averageSessionSeconds: sessions.length ? Math.round(sessions.reduce((sum, row) => sum + Number(row.active_seconds), 0) / sessions.length) : 0,
      activeDays: activeDays.size,
      byArea: [...byArea.values()].sort((a, b) => b.seconds - a.seconds),
    }
  }

  getDashboard() {
    const todayKey = localDateKey()
    const today = dayBounds(todayKey)
    const week = weekBounds(Date.now())
    const structure = this.getStructure()
    return {
      date: todayKey,
      today: this.rangeStats(today.start, today.end),
      week: this.rangeStats(week.start, week.end),
      xp: this.getXpSummary(),
      activeSession: this.getActiveSession(),
      nextTasks: structure.tasks.filter((task) => ['todo', 'doing'].includes(task.status)).slice(0, 6),
      areas: structure.areas,
      achievements: this.getAchievements(),
      settings: this.getSettings(),
      world: this.getWorldState(),
    }
  }

  getHistory(limit = 80) {
    return this.all(`SELECT s.*, t.title AS task_title, a.name AS area_name, a.color AS area_color
      FROM focus_sessions s
      LEFT JOIN tasks t ON t.id = s.task_id
      LEFT JOIN areas a ON a.id = s.area_id
      WHERE s.status = 'completed'
      ORDER BY s.ended_at DESC LIMIT ?`, [Math.max(1, Math.min(Number(limit) || 80, 200))])
      .map((session) => ({ ...session, expedition: this.getExpedition(session.id) }))
  }

  saveDailyReview(data) {
    const date = data.date || localDateKey()
    this.run(`INSERT OR REPLACE INTO daily_reviews (review_date, win, blocker, energy, tomorrow_task, ai_json, ai_model, updated_at)
      VALUES (?, ?, ?, ?, ?, COALESCE((SELECT ai_json FROM daily_reviews WHERE review_date = ?), NULL), COALESCE((SELECT ai_model FROM daily_reviews WHERE review_date = ?), NULL), ?)`, [
      date, String(data.win || '').trim(), String(data.blocker || '').trim(), data.energy || null, String(data.tomorrowTask || '').trim(), date, date, Date.now(),
    ])
    const unlocked = this.checkAchievements()
    return { review: this.getDailyReview(date), unlocked }
  }

  getDailyReview(date = localDateKey()) {
    const row = this.one('SELECT * FROM daily_reviews WHERE review_date = ?', [date])
    const { start, end } = dayBounds(date)
    return { date, stats: this.rangeStats(start, end), review: row ? { ...row, ai: row.ai_json ? JSON.parse(row.ai_json) : null } : null }
  }

  getWeeklyReport(date = localDateKey()) {
    const current = weekBounds(new Date(`${date}T12:00:00`).getTime())
    const previous = { start: current.start - 7 * 86400000, end: current.start }
    const stats = this.rangeStats(current.start, current.end)
    const previousStats = this.rangeStats(previous.start, previous.end)
    const reviews = this.all('SELECT * FROM daily_reviews WHERE review_date >= ? AND review_date < ? ORDER BY review_date', [
      localDateKey(current.start), localDateKey(current.end),
    ])
    const tasks = this.all("SELECT title, completed_at FROM tasks WHERE status = 'done' AND completed_at >= ? AND completed_at < ? ORDER BY completed_at", [current.start, current.end])
    const saved = this.one('SELECT * FROM weekly_reports WHERE week_start = ?', [current.key])
    return {
      weekStart: current.key,
      stats,
      previousStats,
      reviews,
      completedTasks: tasks,
      ai: saved?.ai_json ? JSON.parse(saved.ai_json) : null,
      aiModel: saved?.ai_model || null,
    }
  }

  saveAiReport(type, date, report, model) {
    if (type === 'daily') {
      const current = this.getDailyReview(date)
      const review = current.review || {}
      this.run(`INSERT OR REPLACE INTO daily_reviews (review_date, win, blocker, energy, tomorrow_task, ai_json, ai_model, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [date, review.win || '', review.blocker || '', review.energy || null, review.tomorrow_task || '', JSON.stringify(report), model, Date.now()])
    } else {
      const weekly = this.getWeeklyReport(date)
      this.run('INSERT OR REPLACE INTO weekly_reports (week_start, stats_json, ai_json, ai_model, updated_at) VALUES (?, ?, ?, ?, ?)', [
        weekly.weekStart, JSON.stringify(weekly.stats), JSON.stringify(report), model, Date.now(),
      ])
    }
  }

  getAiPayload(type, date) {
    return type === 'daily' ? this.getDailyReview(date) : this.getWeeklyReport(date)
  }

  openDataPath() {
    return this.dataDir
  }

  shouldSendLongNotification() {
    const active = this.getActiveSession()
    if (!active || active.status !== 'running' || active.long_notified || active.active_seconds < 5400) return null
    this.run('UPDATE focus_sessions SET long_notified = 1 WHERE id = ?', [active.id])
    return active
  }
}

module.exports = { StudyDatabase }
