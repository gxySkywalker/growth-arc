import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// @ts-expect-error The Electron database module is CommonJS and intentionally shared with tests.
import databaseModule from '../../electron/database.cjs'

const { StudyDatabase } = databaseModule
const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('local learning database', () => {
  it('persists a complete focus-to-growth loop without duplicate completion XP', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'growth-arc-test-'))
    tempDirs.push(dir)
    const database = await new StudyDatabase(dir).init()
    const initial = database.getStructure()
    expect(initial.areas).toHaveLength(1)

    const area = initial.areas[0]
    const goal = database.createGoal({ areaId: area.id, title: '完成测试目标' })
    const task = database.createTask({ areaId: area.id, goalId: goal.id, title: '学习一个章节' })
    const session = database.startSession({ taskId: task.id })
    database.run('UPDATE focus_intervals SET started_at = ? WHERE session_id = ?', [Date.now() - 60 * 60 * 1000, session.id])
    const result = database.stopSession(session.id, { outcome: '完成章节练习', taskCompleted: true })

    expect(result.xpAwarded).toBe(62)
    expect(database.getStructure().tasks.find((item: { id: string }) => item.id === task.id)?.status).toBe('done')
    expect(database.getXpSummary().totalXp).toBe(62)

    database.updateTask(task.id, { status: 'done' })
    expect(database.getXpSummary().totalXp).toBe(62)
    expect(database.getDashboard().today.focusSeconds).toBeGreaterThanOrEqual(3590)
  })

  it('seeds a versioned world graph and keeps events and discoveries idempotent', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'growth-arc-world-test-'))
    tempDirs.push(dir)
    const database = await new StudyDatabase(dir).init()

    const initial = database.getWorldFoundation()
    expect(initial.content.version).toBe('0.1.0')
    expect(initial.player.intro_status).toBe('unseen')
    expect(initial.player.created_from_legacy).toBe(false)
    expect(initial.map.regions).toHaveLength(4)
    expect(initial.map.nodes).toHaveLength(8)
    expect(initial.map.edges).toHaveLength(5)
    expect(initial.map.regions.find((item: { id: string }) => item.id === 'border_town')?.state).toBe('discovered')
    expect(initial.map.regions.find((item: { id: string }) => item.id === 'pinewind_forest')?.state).toBe('rumored')

    const player = database.updatePlayerProfile({
      displayName: 'Rowan',
      hairStyle: 'long_braid',
      capeEnabled: false,
      introStatus: 'seen',
    })
    expect(player.display_name).toBe('Rowan')
    expect(player.cape_enabled).toBe(false)
    expect(player.customized_at).toBeTypeOf('number')

    const event = database.recordWorldEvent({
      eventKey: 'test:first-route',
      definitionId: 'first_expedition',
      payload: { route: 'pinewind_gate' },
    })
    const repeatedEvent = database.recordWorldEvent({
      eventKey: 'test:first-route',
      definitionId: 'should_not_replace',
    })
    expect(repeatedEvent.id).toBe(event.id)
    expect(repeatedEvent.definition_id).toBe('first_expedition')

    const discovery = database.recordDiscovery({
      discoveryKey: 'test:pinewind-gate',
      kind: 'node',
      targetId: 'pinewind_gate',
      eventId: event.id,
      metadata: { source: 'test' },
    })
    const repeatedDiscovery = database.recordDiscovery({
      discoveryKey: 'test:pinewind-gate',
      kind: 'node',
      targetId: 'pinewind_gate',
    })
    expect(repeatedDiscovery.id).toBe(discovery.id)

    const reopened = await new StudyDatabase(dir).init()
    const persisted = reopened.getWorldFoundation()
    expect(persisted.player.display_name).toBe('Rowan')
    expect(persisted.player.cape_enabled).toBe(false)
    expect(persisted.map.discoveries).toHaveLength(1)
    expect(persisted.recentEvents).toHaveLength(1)
    expect(persisted.map.nodes.find((item: { id: string }) => item.id === 'pinewind_gate')?.state).toBe('discovered')
    expect(persisted.map.regions.find((item: { id: string }) => item.id === 'pinewind_forest')?.state).toBe('discovered')
  })

  it('attributes completion XP only to the first session that completed a task', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'growth-arc-xp-test-'))
    tempDirs.push(dir)
    const database = await new StudyDatabase(dir).init()
    const area = database.getStructure().areas[0]
    const task = database.createTask({ areaId: area.id, title: '任务一' })

    // first session — completes the task, should get completion XP
    const s1 = database.startSession({ taskId: task.id })
    database.run('UPDATE focus_intervals SET started_at = ? WHERE session_id = ?', [Date.now() - 30 * 60 * 1000, s1.id])
    const r1 = database.stopSession(s1.id, { outcome: '第一次完成', taskCompleted: true })
    const focusXp1 = r1.xpAwarded // focus + completion
    expect(database.getStructure().tasks.find((item: { id: string }) => item.id === task.id)?.status).toBe('done')

    // second session — same task, user checks "task completed" again but no new XP
    const s2 = database.startSession({ taskId: task.id })
    database.run('UPDATE focus_intervals SET started_at = ? WHERE session_id = ?', [Date.now() - 15 * 60 * 1000, s2.id])
    const r2 = database.stopSession(s2.id, { outcome: '又来了一次', taskCompleted: true })

    // second session should NOT include completion XP in xpAwarded
    const completionRow = database.one("SELECT amount FROM xp_transactions WHERE reference_type = 'task' AND kind = 'completion' AND reference_id = ?", [task.id])
    expect(completionRow).toBeTruthy()
    const completionAmount = Number(completionRow.amount)

    // focus XP from first session should be around 12 (30min session = focusXp(1800) ≈ 6) + completion = 20 + floor(30/2) = 20+15 = 35
    // focus XP from second session should be around 6 (15min session = focusXp(900) ≈ 3) with NO completion
    // Total = first(focus+completion) + second(focus only)
    expect(r2.xpAwarded).toBeLessThan(completionAmount) // second session's xp should just be focus, not completion

    // history: completion XP only on first session
    const history = database.getHistory(10)
    const s1History = history.find((s: { id: string }) => s.id === s1.id)
    const s2History = history.find((s: { id: string }) => s.id === s2.id)
    expect(s1History).toBeTruthy()
    expect(s2History).toBeTruthy()
    expect(Number(s1History.xp_awarded)).toBe(focusXp1) // first session includes completion
    // second session's xp_awarded should NOT include completion XP
    const s2Completion = Number(s2History.xp_awarded) - (Number(r2.xpAwarded) || 0) > 0
      ? 'has completion' : 'no completion'
    // r2.xpAwarded is focus only, so s2History.xp_awarded should equal r2.xpAwarded
    expect(Number(s2History.xp_awarded)).toBe(r2.xpAwarded)
  })

  it('creates an available avatar profile when migrating an existing database', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'growth-arc-legacy-test-'))
    tempDirs.push(dir)
    const database = await new StudyDatabase(dir).init()
    const area = database.getStructure().areas[0]
    database.createTask({ areaId: area.id, title: 'Preserved task' })
    database.run('DROP TABLE player_profiles')

    const migrated = await new StudyDatabase(dir).init()
    const foundation = migrated.getWorldFoundation()
    expect(foundation.player.intro_status).toBe('available')
    expect(foundation.player.created_from_legacy).toBe(true)
    expect(migrated.getStructure().tasks.some((item: { title: string }) => item.title === 'Preserved task')).toBe(true)
  })

  it('awards 0 completion XP for tasks with no focus history', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'growth-arc-zeroxp-'))
    tempDirs.push(dir)
    const database = await new StudyDatabase(dir).init()
    const area = database.getStructure().areas[0]
    const task = database.createTask({ areaId: area.id, title: 'No focus task' })
    const result = database.manualCompleteTask(task.id)
    expect(result.xpAwarded).toBe(0)
    expect(result.alreadyAwarded).toBe(false)
    const done = database.getAllStructure().tasks.find((t: { id: string }) => t.id === task.id)
    expect(done?.status).toBe('done')
    expect(done?.completion_xp_awarded).toBe(0) // stays 0 when no XP awarded
  })

  it('prevents duplicate completion XP on re-complete after restore', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'growth-arc-dupe-xp-'))
    tempDirs.push(dir)
    const database = await new StudyDatabase(dir).init()
    const area = database.getStructure().areas[0]
    const task = database.createTask({ areaId: area.id, title: 'Dup test' })
    const session = database.startSession({ taskId: task.id })
    database.run('UPDATE focus_intervals SET started_at = ? WHERE session_id = ?', [Date.now() - 30 * 60 * 1000, session.id])
    database.stopSession(session.id, { outcome: 'Done', taskCompleted: true })
    const xpAfterFirst = database.getXpSummary().totalXp
    expect(database.getStructure().tasks.find((t: { id: string }) => t.id === task.id)?.status).toBe('done')
    // restore via reopen (keeps completion_xp_awarded=1)
    database.reopenTask(task.id)
    // re-complete manually — status should update to done, but alreadyAwarded=true, xpAwarded=0
    const result2 = database.manualCompleteTask(task.id)
    expect(result2.alreadyAwarded).toBe(true)
    expect(result2.xpAwarded).toBe(0)
    const doneTask = database.getAllStructure().tasks.find((t: { id: string }) => t.id === task.id)
    expect(doneTask?.status).toBe('done')
    // total XP unchanged
    expect(database.getXpSummary().totalXp).toBe(xpAfterFirst)
  })

  it('rejects hard-delete of area with tasks or goals', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'growth-arc-area-del-'))
    tempDirs.push(dir)
    const database = await new StudyDatabase(dir).init()
    const area = database.createArea({ name: 'Test', color: '#a55c36' })
    database.createTask({ areaId: area.id, title: 'T' })
    expect(() => database.deleteArea(area.id)).toThrow()
  })

  it('allows archive and restore of area, goal, and task', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'growth-arc-archive-'))
    tempDirs.push(dir)
    const database = await new StudyDatabase(dir).init()
    const area = database.createArea({ name: 'ArchiveTest', color: '#6f8255' })
    const goal = database.createGoal({ areaId: area.id, title: 'G' })
    const task = database.createTask({ areaId: area.id, goalId: goal.id, title: 'T' })
    // complete task first (archiveArea requires no active tasks)
    database.run("UPDATE tasks SET status = 'archived', updated_at = ? WHERE id = ?", [Date.now(), task.id])
    expect(database.getStructure().tasks.find((t: { id: string }) => t.id === task.id)).toBeFalsy()
    const restored = database.restoreTask(task.id)
    expect(restored.status).toBe('todo')
    // archive task again
    database.run("UPDATE tasks SET status = 'archived', updated_at = ? WHERE id = ?", [Date.now(), task.id])
    // archive goal
    database.archiveGoal(goal.id)
    expect(database.getStructure().goals.find((g: { id: string }) => g.id === goal.id)).toBeFalsy()
    const restoredGoal = database.restoreGoal(goal.id)
    expect(restoredGoal.status).toBe('active')
    // archive area (now no active tasks)
    database.archiveArea(area.id)
    expect(database.getStructure().areas.find((a: { id: string }) => a.id === area.id)).toBeFalsy()
    const restoredArea = database.restoreArea(area.id)
    expect(restoredArea.archived).toBe(0)
  })

  it('syncs today task after completion and set-as-today', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'growth-arc-today-'))
    tempDirs.push(dir)
    const database = await new StudyDatabase(dir).init()
    const area = database.getStructure().areas[0]
    const t1 = database.createTask({ areaId: area.id, title: 'Task 1' })
    const t2 = database.createTask({ areaId: area.id, title: 'Task 2' })
    const t3 = database.createTask({ areaId: area.id, title: 'Task 3' })
    // default: t1 should be first (sort_order 1)
    const dash = database.getDashboard()
    expect(dash.nextTasks[0]?.id).toBe(t1.id)
    // complete t1
    database.manualCompleteTask(t1.id)
    const dash2 = database.getDashboard()
    expect(dash2.nextTasks[0]?.id).toBe(t2.id)
    // reorder: move t3 to top
    database.reorderTasks([{ id: t3.id, sortOrder: 0 }, { id: t2.id, sortOrder: 2 }, { id: t1.id, sortOrder: 3 }])
    const dash3 = database.getDashboard()
    expect(dash3.nextTasks[0]?.id).toBe(t3.id)
  })
})
