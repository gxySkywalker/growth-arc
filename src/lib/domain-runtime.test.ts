import { describe, expect, it } from 'vitest'
// @ts-expect-error The Electron domain module is CommonJS and intentionally shared with tests.
import domain from '../../electron/domain.cjs'

const { focusXp, completionXp, levelFromXp, secondsWithinRange } = domain

describe('experience and time rules', () => {
  it('keeps focus rewards bounded and completion rewards dominant', () => {
    expect(focusXp(59)).toBe(0)
    expect(focusXp(90 * 60)).toBe(18)
    expect(focusXp(240 * 60)).toBe(24)
    expect(completionXp(0)).toBe(20)
    expect(completionXp(300 * 60)).toBe(110)
  })

  it('uses a progressive level curve', () => {
    expect(levelFromXp(100)).toMatchObject({ level: 2, currentXp: 0, nextLevelXp: 125 })
    expect(levelFromXp(240)).toMatchObject({ level: 3, currentXp: 15, nextLevelXp: 150 })
  })

  it('counts only interval overlap in reports', () => {
    expect(secondsWithinRange(1_000, 11_000, 6_000, 20_000)).toBe(5)
    expect(secondsWithinRange(1_000, 4_000, 6_000, 20_000)).toBe(0)
  })
})
