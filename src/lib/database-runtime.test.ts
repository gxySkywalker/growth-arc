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
})
