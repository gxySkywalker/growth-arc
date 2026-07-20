import { describe, expect, it } from 'vitest'
// @ts-expect-error The Electron domain module is CommonJS and intentionally shared with tests.
import domain from '../../electron/domain.cjs'

const { focusXp, completionXp, levelFromXp, secondsWithinRange, getReturnKind, countSessionTypes, shouldGenerateDailyLetter, shouldGenerateWeeklyLetter, getDailyPeriod, getWeeklyPeriod, generateLocalLetterSubject, generateDailyTemplate, generateWeeklyTemplate, buildDailyLetterFacts, buildWeeklyLetterFacts, hashSeed, formatDurationZh, neutralCompare } = domain

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

describe('getReturnKind', () => {
  it('maps seconds to the correct bucket', () => {
    expect(getReturnKind(0)).toBe('brief')
    expect(getReturnKind(59)).toBe('brief')
    expect(getReturnKind(60)).toBe('short')
    expect(getReturnKind(299)).toBe('short')
    expect(getReturnKind(300)).toBe('expedition')
    expect(getReturnKind(1799)).toBe('expedition')
    expect(getReturnKind(1800)).toBe('deep')
  })
})

describe('countSessionTypes', () => {
  it('groups sessions by return kind', () => {
    const sessions = [
      { active_seconds: 0 },
      { active_seconds: 30 },
      { active_seconds: 120 },
      { active_seconds: 600 },
      { active_seconds: 3600 },
    ]
    const counts = countSessionTypes(sessions)
    expect(counts).toEqual({ brief: 2, short: 1, expedition: 1, deep: 1 })
  })
})

describe('shouldGenerateDailyLetter', () => {
  it('empty facts -> false', () => {
    expect(shouldGenerateDailyLetter({ sessionCounts: {}, completedTaskCount: 0 })).toBe(false)
  })

  it('short or longer -> true', () => {
    expect(shouldGenerateDailyLetter({ sessionCounts: { short: 1 } })).toBe(true)
    expect(shouldGenerateDailyLetter({ sessionCounts: { expedition: 1 } })).toBe(true)
    expect(shouldGenerateDailyLetter({ sessionCounts: { deep: 1 } })).toBe(true)
  })

  it('no session + completedTask > 0 -> true', () => {
    expect(shouldGenerateDailyLetter({ sessionCounts: {}, completedTaskCount: 1 })).toBe(true)
  })

  it('no session + hasWrittenReview -> true', () => {
    expect(shouldGenerateDailyLetter({ sessionCounts: {}, hasWrittenReview: true })).toBe(true)
  })

  it('no session + energy only -> false', () => {
    expect(shouldGenerateDailyLetter({ sessionCounts: {}, hasWrittenReview: false })).toBe(false)
  })

  it('brief + empty outcome -> false', () => {
    expect(shouldGenerateDailyLetter({ sessionCounts: { brief: 1 }, hasOutcome: false })).toBe(false)
  })

  it('brief + valid outcome -> true', () => {
    expect(shouldGenerateDailyLetter({ sessionCounts: { brief: 1 }, hasOutcome: true })).toBe(true)
  })

  it('no session + hasOutcome -> true', () => {
    expect(shouldGenerateDailyLetter({ sessionCounts: {}, hasOutcome: true })).toBe(true)
  })

  it('hasWorldEvent / hasSpecialEvent -> true', () => {
    expect(shouldGenerateDailyLetter({ sessionCounts: {}, hasWorldEvent: true })).toBe(true)
    expect(shouldGenerateDailyLetter({ sessionCounts: {}, hasSpecialEvent: true })).toBe(true)
  })
})

describe('shouldGenerateWeeklyLetter', () => {
  it('empty -> false', () => {
    expect(shouldGenerateWeeklyLetter({ sessionCounts: {} })).toBe(false)
  })

  it('short or longer -> true', () => {
    expect(shouldGenerateWeeklyLetter({ sessionCounts: { short: 1 } })).toBe(true)
    expect(shouldGenerateWeeklyLetter({ sessionCounts: { expedition: 1 } })).toBe(true)
    expect(shouldGenerateWeeklyLetter({ sessionCounts: { deep: 1 } })).toBe(true)
  })

  it('week of only empty brief -> false', () => {
    expect(shouldGenerateWeeklyLetter({ sessionCounts: { brief: 3 } })).toBe(false)
  })

  it('only brief but completedTask -> true', () => {
    expect(shouldGenerateWeeklyLetter({ sessionCounts: { brief: 1 }, completedTaskCount: 2 })).toBe(true)
  })

  it('only brief but hasWrittenReview -> true', () => {
    expect(shouldGenerateWeeklyLetter({ sessionCounts: { brief: 1 }, hasWrittenReview: true })).toBe(true)
  })

  it('only brief but hasOutcome -> true', () => {
    expect(shouldGenerateWeeklyLetter({ sessionCounts: { brief: 1 }, hasOutcome: true })).toBe(true)
  })

  it('only brief but hasSpecialEvent -> true', () => {
    expect(shouldGenerateWeeklyLetter({ sessionCounts: { brief: 1 }, hasSpecialEvent: true })).toBe(true)
  })
})

describe('period utilities', () => {
  it('daily period returns local day boundaries', () => {
    const p = getDailyPeriod(Date.UTC(2026, 6, 20, 14, 0, 0))
    expect(p.periodKey).toBeTruthy()
    expect(p.periodStart).toBeLessThan(p.periodEnd)
    expect(p.periodEnd - p.periodStart).toBe(86400000)
    expect(p.timezoneName).toBeTruthy()
    expect(typeof p.timezoneOffsetMinutes).toBe('number')
  })

  it('weekly period uses Monday start', () => {
    const p = getWeeklyPeriod(Date.UTC(2026, 6, 20, 14, 0, 0))
    expect(p.periodKey).toBeTruthy()
    expect(p.periodEnd - p.periodStart).toBe(7 * 86400000)
    // Key should be a Monday
    const d = new Date(p.periodStart)
    expect(d.getDay()).toBe(1) // Monday (local time)
  })
})

describe('subject generation', () => {
  const baseFacts = (overrides?: any) => ({
    sessionCounts: { brief: 0, short: 1, expedition: 0, deep: 0 },
    hasWrittenReview: false,
    periodStart: Date.UTC(2026, 6, 20),
    ...overrides,
  })

  it('stable with same seed', () => {
    const f = baseFacts()
    expect(generateLocalLetterSubject('daily', f, 'seed1')).toBe(generateLocalLetterSubject('daily', f, 'seed1'))
  })

  it('review only uses review pool', () => {
    const f = baseFacts({ sessionCounts: { brief: 1, short: 0, expedition: 0, deep: 0 }, hasWrittenReview: true })
    const s = generateLocalLetterSubject('daily', f, 'test')
    expect(['记下的一句话', '天文台留下的字句']).toContain(s)
  })

  it('no KPI words in subjects', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const f = baseFacts()
      const s = generateLocalLetterSubject('daily', f, seed)
      expect(s).not.toContain('报告')
      expect(s).not.toContain('效率')
      expect(s).not.toContain('日评')
      expect(s).not.toContain('进步')
      expect(s).not.toContain('表现')
    }
  })
})

describe('template generation', () => {
  const facts = (overrides?: any) => ({
    totalActiveSeconds: 3600,
    sessionCounts: { brief: 0, short: 0, expedition: 1, deep: 0 },
    completedTasks: [{ id: 't1', title: '复习数学' }],
    directionBreakdown: [{ id: 'a1', name: '通用学习', color: '#ccc', seconds: 3600 }],
    longestSessionSeconds: 3600,
    ...overrides,
  })

  it('daily template stable with same seed', () => {
    const f = facts()
    expect(generateDailyTemplate(f, 's1')).toBe(generateDailyTemplate(f, 's1'))
  })

  it('weekly template stable with same seed', () => {
    const f = facts()
    expect(generateWeeklyTemplate(f, 's1')).toBe(generateWeeklyTemplate(f, 's1'))
  })

  it('daily template length in range', () => {
    const body = generateDailyTemplate(facts(), 't1')
    expect(body.length).toBeGreaterThanOrEqual(10)
    expect(body.length).toBeLessThanOrEqual(300)
  })

  it('no KPI words in templates', () => {
    const d = generateDailyTemplate(facts(), 'x')
    expect(d).not.toContain('效率')
    expect(d).not.toContain('表现')
    expect(d).not.toContain('退步')
    expect(d).not.toContain('失败')
    const w = generateWeeklyTemplate(facts({ previousPeriodTotalSeconds: 7200 }), 'x')
    expect(w).not.toContain('退步')
    expect(w).not.toContain('落后')
  })

  it('review-only daily does not mention expedition', () => {
    const f = facts({ totalActiveSeconds: 0, sessionCounts: { brief: 0, short: 0, expedition: 0, deep: 0 }, hasWrittenReview: true })
    const body = generateDailyTemplate(f, 'r1')
    expect(body).not.toContain('远征')
    expect(body).not.toContain('专注')
  })

  it('weekly template handles zero previous', () => {
    const w = generateWeeklyTemplate(facts({ previousPeriodTotalSeconds: 0 }), 'w0')
    expect(w).toContain('上周暂无记录')
  })
})

describe('facts builders', () => {
  const period = { periodKey: '2026-07-20', periodStart: 1752595200000, periodEnd: 1752681600000, timezoneName: 'UTC', timezoneOffsetMinutes: 0 }

  it('daily facts snapshot includes task titles', () => {
    const stats = { totalActiveSeconds: 100, sessionCounts: { brief: 0, short: 1, expedition: 0, deep: 0 }, completedTasks: [{ id: 't1', title: 'ABC' }], directionBreakdown: [], longestSessionSeconds: 100, hasOutcome: false, hasWrittenReview: false }
    const f = buildDailyLetterFacts(stats, period)
    expect(f.schemaVersion).toBe(1)
    expect(f.completedTasks[0].title).toBe('ABC')
    expect(f.hasWorldEvent).toBe(false)
  })

  it('weekly facts includes daily breakdown and previous', () => {
    const stats = { totalActiveSeconds: 7200, sessionCounts: { brief: 0, short: 0, expedition: 2, deep: 0 }, dailyActiveSeconds: [0, 3600, 0, 3600, 0, 0, 0], completedTasks: [], directionBreakdown: [], longestSessionSeconds: 3600, hasWrittenReview: false, hasOutcome: false }
    const f = buildWeeklyLetterFacts(stats, period, 5400)
    expect(f.dailyActiveSeconds).toHaveLength(7)
    expect(f.previousPeriodTotalSeconds).toBe(5400)
  })
})

describe('helper functions', () => {
  it('formatDurationZh returns seconds for sub-minute', () => {
    expect(formatDurationZh(0)).toBe('0 秒')
    expect(formatDurationZh(18)).toBe('18 秒')
    expect(formatDurationZh(60)).toBe('1 分 0 秒')
    expect(formatDurationZh(3661)).toBe('1 小时 1 分钟')
  })

  it('neutralCompare uses soft language', () => {
    expect(neutralCompare(7200, 5400)).toContain('多记录了')
    expect(neutralCompare(5400, 7200)).toContain('少记录了')
    expect(neutralCompare(7200, 0)).toBe('上周暂无记录')
    expect(neutralCompare(7200, 7200)).toContain('相近')
  })

  it('hashSeed deterministic', () => {
    expect(hashSeed('hello')).toBe(hashSeed('hello'))
    expect(hashSeed('hello')).not.toBe(hashSeed('world'))
  })
})
