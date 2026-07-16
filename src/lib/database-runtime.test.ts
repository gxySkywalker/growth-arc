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
})
