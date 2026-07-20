const ACHIEVEMENTS = [
  { code: 'first_focus', icon: 'spark', title: '第一束光', description: '完成第一次有效专注' },
  { code: 'focus_10h', icon: 'clock', title: '渐入佳境', description: '累计专注 10 小时' },
  { code: 'focus_50h', icon: 'flame', title: '沉浸者', description: '累计专注 50 小时' },
  { code: 'task_10', icon: 'check', title: '行动派', description: '完成 10 个学习事项' },
  { code: 'task_50', icon: 'flag', title: '可靠的完成者', description: '完成 50 个学习事项' },
  { code: 'deep_10', icon: 'mountain', title: '深潜', description: '完成 10 次至少 60 分钟的专注' },
  { code: 'explorer', icon: 'compass', title: '多面探索者', description: '在至少 3 个领域留下专注记录' },
  { code: 'reflection_7', icon: 'book', title: '诚实的镜子', description: '完成 7 次日复盘' },
  { code: 'rhythm_7', icon: 'wave', title: '找到节奏', description: '最近 14 天中有 7 天保持学习' },
]

function focusXp(activeSeconds) {
  if (!Number.isFinite(activeSeconds) || activeSeconds < 60) return 0
  return Math.min(24, Math.floor(activeSeconds / 60 / 5))
}

function completionXp(totalTaskSeconds) {
  const minutes = Math.max(0, Math.floor((Number(totalTaskSeconds) || 0) / 60))
  return 20 + Math.floor(Math.min(minutes, 180) / 2)
}

function levelFromXp(totalXp) {
  let level = 1
  let remaining = Math.max(0, Math.floor(Number(totalXp) || 0))
  let required = 100
  while (remaining >= required) {
    remaining -= required
    level += 1
    required = 100 + 25 * (level - 1)
  }
  return {
    level,
    currentXp: remaining,
    nextLevelXp: required,
    progress: required ? remaining / required : 0,
  }
}

function secondsWithinRange(startedAt, endedAt, rangeStart, rangeEnd) {
  const start = Math.max(Number(startedAt), Number(rangeStart))
  const end = Math.min(Number(endedAt), Number(rangeEnd))
  return Math.max(0, Math.floor((end - start) / 1000))
}

function localDateKey(value = Date.now()) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dayBounds(dateKey = localDateKey()) {
  const start = new Date(`${dateKey}T00:00:00`).getTime()
  const end = new Date(`${dateKey}T00:00:00`).setDate(new Date(`${dateKey}T00:00:00`).getDate() + 1)
  return { start, end }
}

function weekStartKey(value = Date.now()) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return localDateKey(date.getTime())
}

function weekBounds(dateOrKey = Date.now()) {
  const value = typeof dateOrKey === 'string' ? new Date(`${dateOrKey}T12:00:00`).getTime() : dateOrKey
  const key = weekStartKey(value)
  const { start } = dayBounds(key)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end: end.getTime(), key }
}

function getReturnKind(activeSeconds) {
  const s = Math.max(0, Number(activeSeconds) || 0)
  if (s < 60) return 'brief'
  if (s < 300) return 'short'
  if (s < 1800) return 'expedition'
  return 'deep'
}

function countSessionTypes(sessions) {
  const counts = { brief: 0, short: 0, expedition: 0, deep: 0 }
  for (const s of sessions) {
    const kind = getReturnKind(Number(s.active_seconds) || 0)
    if (counts[kind] !== undefined) counts[kind]++
  }
  return counts
}

function shouldGenerateDailyLetter(facts) {
  const { sessionCounts = {}, completedTaskCount = 0 } = facts
  const { brief = 0, short = 0, expedition = 0, deep = 0 } = sessionCounts

  if (short > 0 || expedition > 0 || deep > 0) return true

  const hasWrittenReview = typeof facts.hasWrittenReview === 'boolean'
    ? facts.hasWrittenReview
    : false
  const hasOutcome = facts.hasOutcome === true
  const hasWorldEvent = facts.hasWorldEvent === true
  const hasSpecialEvent = facts.hasSpecialEvent === true

  const hasMeaningfulRecord =
    completedTaskCount > 0 ||
    hasWrittenReview ||
    hasOutcome ||
    hasWorldEvent ||
    hasSpecialEvent

  if (hasMeaningfulRecord) return true
  return false
}

function shouldGenerateWeeklyLetter(facts) {
  const { sessionCounts = {}, completedTaskCount = 0 } = facts
  const { short = 0, expedition = 0, deep = 0 } = sessionCounts

  if (short > 0 || expedition > 0 || deep > 0) return true

  const hasMeaningfulRecord =
    completedTaskCount > 0 ||
    facts.hasWrittenReview === true ||
    facts.hasOutcome === true ||
    facts.hasWorldEvent === true ||
    facts.hasSpecialEvent === true

  if (hasMeaningfulRecord) return true
  return false
}

// ── Period utilities ────────────────────────────────────────

function tzInfo(now = Date.now()) {
  const d = new Date(now)
  return {
    timezoneName: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffsetMinutes: -d.getTimezoneOffset(),
  }
}

function getDailyPeriod(now = Date.now()) {
  const key = localDateKey(now)
  const bounds = dayBounds(key)
  return { periodKey: key, periodStart: bounds.start, periodEnd: bounds.end, ...tzInfo(now) }
}

function getWeeklyPeriod(now = Date.now()) {
  const wk = weekBounds(now)
  return { periodKey: wk.key, periodStart: wk.start, periodEnd: wk.end, ...tzInfo(now) }
}

function previousWeeklyPeriod(now = Date.now()) {
  const wk = weekBounds(now)
  const prevStart = wk.start - 7 * 86400000
  return getWeeklyPeriod(prevStart)
}

// ── Simple hash seed ────────────────────────────────────────

function hashSeed(input) {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h) + input.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

// ── Subject generation ──────────────────────────────────────

const DAILY_SUBJECTS_NORMAL = ['今天留下的足迹', '炉火旁整理好的记录', '今天走过的这一段']
const DAILY_SUBJECTS_SHORT = ['一段短短的归程', '今天留下的小路标']
const DAILY_SUBJECTS_REVIEW_ONLY = ['记下的一句话', '天文台留下的字句']
const WEEKLY_SUBJECTS = ['这一周整理好的道路记录', '从周一到周日的来信']

function generateLocalLetterSubject(type, facts, seedInput) {
  const seed = hashSeed(seedInput)
  if (type === 'daily') {
    const counts = facts.sessionCounts || {}
    const hasSession = (counts.short + counts.expedition + counts.deep) > 0
    const onlyReview = !hasSession && facts.hasWrittenReview
    if (onlyReview) return DAILY_SUBJECTS_REVIEW_ONLY[seed % DAILY_SUBJECTS_REVIEW_ONLY.length]
    if (hasSession) return DAILY_SUBJECTS_NORMAL[seed % DAILY_SUBJECTS_NORMAL.length]
    return DAILY_SUBJECTS_SHORT[seed % DAILY_SUBJECTS_SHORT.length]
  }
  const weeks = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']
  const d = new Date(facts.periodStart)
  const label = `${weeks[d.getMonth()]}第${Math.ceil(d.getDate() / 7)}周`
  return seed % 3 === 0 ? `${label}的信` : WEEKLY_SUBJECTS[seed % WEEKLY_SUBJECTS.length]
}

// ── Template generation ─────────────────────────────────────

function formatDurationZh(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h) return `${h} 小时 ${m} 分钟`
  if (m) return `${m} 分 ${sec} 秒`
  return `${sec} 秒`
}

function neutralCompare(curr, prev) {
  if (!prev) return '上周暂无记录'
  const diff = curr - prev
  if (diff === 0) return '和上周留下了相近的时间'
  return diff > 0
    ? `比上周多记录了 ${formatDurationZh(Math.abs(diff))}`
    : `比上周少记录了 ${formatDurationZh(Math.abs(diff))}`
}

function topDirection(facts) {
  const d = facts.directionBreakdown && facts.directionBreakdown[0]
  return d ? ` ${d.name}` : ''
}

function generateDailyTemplate(facts, seedInput) {
  const seed = hashSeed(seedInput)
  const hasSession = facts.totalActiveSeconds > 0
  const secs = facts.totalActiveSeconds || 0
  const tasks = facts.completedTasks || []
  const parts = []
  if (!hasSession && facts.hasWrittenReview) {
    parts.push('天文台留下了一句话。')
    parts.push('今天有一段记录被收好。')
    return parts.join('')
  }
  if (!hasSession) {
    const pick = seed % 3
    if (pick === 0) parts.push('今天没有走远。')
    else if (pick === 1) parts.push('这一小段路很短，但发生的事情已经记下了。')
    else parts.push('这段记录很短。不过它也是旅途的一部分。')
    if (tasks.length) parts.push(`抵达了 ${tasks.length} 个路标。`)
    parts.push('明天见。')
    return parts.join('')
  }
  parts.push(`今天共专注 ${formatDurationZh(secs)}。`)
  if (tasks.length) parts.push(`完成了 ${tasks.length} 个路标。`)
  const dir = topDirection(facts)
  if (dir) parts.push(`主要的方向是${dir}。`)
  parts.push(seed % 2 === 0 ? '炉火旁安静地收好今天。' : '小屋的灯还亮着。明天见。')
  return parts.join('')
}

function generateWeeklyTemplate(facts, seedInput) {
  const seed = hashSeed(seedInput)
  const parts = []
  parts.push(`本周共专注 ${formatDurationZh(facts.totalActiveSeconds)}。`)
  const diff = neutralCompare(facts.totalActiveSeconds, facts.previousPeriodTotalSeconds || 0)
  parts.push(diff + '。')
  const { brief = 0, short = 0, expedition = 0, deep = 0 } = facts.sessionCounts || {}
  if (expedition + deep > 0) parts.push(`${expedition + deep} 次正式远征，`)
  if (short > 0) parts.push(`${short} 次短程归来，`)
  if (brief > 0 && expedition + deep + short === 0) parts.push('几次短途折返，')
  if (facts.completedTasks && facts.completedTasks.length) {
    parts.push(`完成了 ${facts.completedTasks.length} 个路标。`)
  }
  const dir = topDirection(facts)
  if (dir) parts.push(`投入最多的方向是${dir}。`)
  parts.push(seed % 2 === 0 ? '把这些整理好放进旅途编年史里。新的一周也请多指教。' : '一周的足迹已经归档。愿新的星期带来安静的专注。')
  return parts.join('')
}

// ── Facts builders ──────────────────────────────────────────

function buildDailyLetterFacts(stats, period) {
  return {
    schemaVersion: 1,
    periodType: 'daily',
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    timezoneName: period.timezoneName,
    timezoneOffsetMinutes: period.timezoneOffsetMinutes,
    totalActiveSeconds: stats.totalActiveSeconds,
    sessionCounts: stats.sessionCounts,
    completedTasks: (stats.completedTasks || []).map(t => ({ id: t.id, title: t.title })),
    directionBreakdown: (stats.directionBreakdown || []).map(d => ({ id: d.id, name: d.name, color: d.color, seconds: d.seconds })),
    longestSessionSeconds: stats.longestSessionSeconds || 0,
    hasOutcome: stats.hasOutcome === true,
    hasWrittenReview: stats.hasWrittenReview === true,
    hasWorldEvent: false,
    hasSpecialEvent: false,
  }
}

function buildWeeklyLetterFacts(stats, period, prevTotal) {
  return {
    schemaVersion: 1,
    periodType: 'weekly',
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    timezoneName: period.timezoneName,
    timezoneOffsetMinutes: period.timezoneOffsetMinutes,
    totalActiveSeconds: stats.totalActiveSeconds,
    dailyActiveSeconds: stats.dailyActiveSeconds || [0, 0, 0, 0, 0, 0, 0],
    sessionCounts: stats.sessionCounts,
    completedTasks: (stats.completedTasks || []).map(t => ({ id: t.id, title: t.title })),
    directionBreakdown: (stats.directionBreakdown || []).map(d => ({ id: d.id, name: d.name, color: d.color, seconds: d.seconds })),
    longestSessionSeconds: stats.longestSessionSeconds || 0,
    previousPeriodTotalSeconds: prevTotal || 0,
    hasWrittenReview: stats.hasWrittenReview === true,
    hasOutcome: stats.hasOutcome === true,
    hasWorldEvent: false,
    hasSpecialEvent: false,
  }
}

// ── Daily stats helper (database.cjs consumer) ──────────────

function buildDailyStatsForFacts(db, period) {
  const stats = db.getCompletedStats(period.periodStart, period.periodEnd)
  const completedTasks = db.all(
    "SELECT id, title FROM tasks WHERE status = 'done' AND completed_at >= ? AND completed_at < ?",
    [period.periodStart, period.periodEnd],
  )
  const review = db.one('SELECT win, blocker, tomorrow_task, energy FROM daily_reviews WHERE review_date = ?', [period.periodKey])
  const hasWrittenReview = review
    ? Boolean(String(review.win || '').trim() || String(review.blocker || '').trim() || String(review.tomorrow_task || '').trim())
    : false
  const hasOutcome = db.one(
    "SELECT COUNT(*) AS count FROM focus_sessions WHERE status = 'completed' AND ended_at >= ? AND ended_at < ? AND outcome IS NOT NULL AND outcome != '' AND TRIM(outcome) != ''",
    [period.periodStart, period.periodEnd],
  ).count > 0
  return { ...stats, completedTasks, hasWrittenReview, hasOutcome }
}

function buildWeeklyStatsForFacts(db, period) {
  const stats = db.getCompletedStats(period.periodStart, period.periodEnd)
  const dailyActiveSeconds = []
  for (let i = 0; i < 7; i++) {
    const dayStart = period.periodStart + i * 86400000
    const dayEnd = dayStart + 86400000
    const dayStats = db.getCompletedStats(dayStart, dayEnd)
    dailyActiveSeconds.push(dayStats.totalActiveSeconds)
  }
  const completedTasks = db.all(
    "SELECT id, title FROM tasks WHERE status = 'done' AND completed_at >= ? AND completed_at < ?",
    [period.periodStart, period.periodEnd],
  )
  const review = db.one(
    "SELECT COUNT(*) AS count FROM daily_reviews WHERE review_date >= ? AND review_date < ? AND (TRIM(COALESCE(win,'')) != '' OR TRIM(COALESCE(blocker,'')) != '' OR TRIM(COALESCE(tomorrow_task,'')) != '')",
    [localDateKey(period.periodStart), localDateKey(period.periodEnd - 86400000)],
  )
  const hasOutcome = db.one(
    "SELECT COUNT(*) AS count FROM focus_sessions WHERE status = 'completed' AND ended_at >= ? AND ended_at < ? AND outcome IS NOT NULL AND outcome != '' AND TRIM(outcome) != ''",
    [period.periodStart, period.periodEnd],
  ).count > 0
  return { ...stats, dailyActiveSeconds, completedTasks, hasWrittenReview: review ? review.count > 0 : false, hasOutcome }
}

const TIME_WINDOWS = [
  { label: '深夜', hours: [0, 1, 2, 3, 4, 5] },
  { label: '清晨', hours: [6, 7, 8] },
  { label: '上午', hours: [9, 10, 11] },
  { label: '午后', hours: [12, 13, 14, 15, 16, 17] },
  { label: '晚间', hours: [18, 19, 20, 21, 22, 23] },
]

module.exports = {
  ACHIEVEMENTS,
  focusXp,
  completionXp,
  levelFromXp,
  secondsWithinRange,
  localDateKey,
  dayBounds,
  weekStartKey,
  weekBounds,
  getReturnKind,
  countSessionTypes,
  shouldGenerateDailyLetter,
  shouldGenerateWeeklyLetter,
  getDailyPeriod,
  getWeeklyPeriod,
  previousWeeklyPeriod,
  hashSeed,
  generateLocalLetterSubject,
  generateDailyTemplate,
  generateWeeklyTemplate,
  buildDailyLetterFacts,
  buildWeeklyLetterFacts,
  buildDailyStatsForFacts,
  buildWeeklyStatsForFacts,
  formatDurationZh,
  neutralCompare,
  computeDailyHourly,
  computeWeeklyHeatmap,
  getDominantTimeWindow,
}

function getDominantTimeWindow(hourlyData) {
  if (!hourlyData || hourlyData.length !== 24) return null
  const sums = TIME_WINDOWS.map(w => ({
    label: w.label,
    total: w.hours.reduce((s, h) => s + (hourlyData[h] || 0), 0),
  }))
  const max = sums.reduce((m, w) => Math.max(m, w.total), 0)
  if (max === 0) return null
  return sums.find(w => w.total === max) || null
}

function computeDailyHourly(db, period) {
  const intervals = db.all(
    `SELECT i.started_at, i.ended_at FROM focus_intervals i
     JOIN focus_sessions s ON s.id = i.session_id
     WHERE s.status = 'completed' AND s.ended_at >= ? AND s.ended_at < ?`,
    [period.periodStart, period.periodEnd],
  )
  if (typeof process !== 'undefined' && process.env?.VITE_DEV_SERVER_URL) {
    console.log('[domain:computeDailyHourly]', { periodKey: period.periodKey, intervalCount: intervals.length, periodStart: new Date(period.periodStart).toISOString(), periodEnd: new Date(period.periodEnd).toISOString() })
  }
  const hourly = new Array(24).fill(0)
  for (const iv of intervals) {
    const cursor = Math.max(new Date(iv.started_at).getTime(), period.periodStart)
    const end = Math.min(iv.ended_at || Date.now(), period.periodEnd)
    let t = cursor
    while (t < end) {
      const d = new Date(t)
      const hourStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime()
      const hourEnd = hourStart + 3600000
      const overlap = Math.min(end, hourEnd) - Math.max(t, hourStart)
      if (overlap > 0) hourly[d.getHours()] += Math.round(overlap / 1000)
      t = hourEnd
    }
  }
  // Zero out future hours when viewing today
  const todayStart = dayBounds(localDateKey()).start
  if (period.periodStart >= todayStart) {
    const nowHour = new Date().getHours()
    for (let h = nowHour + 1; h < 24; h++) hourly[h] = 0
  }
  return hourly
}

function computeWeeklyHeatmap(db, period) {
  const matrix = []
  for (let day = 0; day < 7; day++) {
    const dayStart = period.periodStart + day * 86400000
    const dayEnd = dayStart + 86400000
    matrix.push(computeDailyHourly(db, { periodStart: dayStart, periodEnd: dayEnd }))
  }
  return matrix
}
