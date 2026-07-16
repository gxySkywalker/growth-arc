const { describe, it, expect } = require('vitest')
const { focusXp, completionXp, levelFromXp, secondsWithinRange } = require('./domain.cjs')

describe('experience rules', () => {
  it('caps focus XP and keeps completion dominant', () => {
    expect(focusXp(59)).toBe(0)
    expect(focusXp(90 * 60)).toBe(18)
    expect(focusXp(240 * 60)).toBe(24)
    expect(completionXp(0)).toBe(20)
    expect(completionXp(300 * 60)).toBe(110)
  })
  it('calculates progressive levels', () => {
    expect(levelFromXp(100)).toMatchObject({ level: 2, currentXp: 0, nextLevelXp: 125 })
    expect(levelFromXp(240)).toMatchObject({ level: 3, currentXp: 15, nextLevelXp: 150 })
  })
  it('counts only time inside a reporting range', () => {
    expect(secondsWithinRange(1_000, 11_000, 6_000, 20_000)).toBe(5)
    expect(secondsWithinRange(1_000, 4_000, 6_000, 20_000)).toBe(0)
  })
})
