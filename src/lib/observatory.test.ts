import { describe, expect, it } from 'vitest'
import { formatPeriodRange, getTrendText, mapReturnKindLabel, calculateBarHeights, formatSessionCounts, heatLevel, formatMinutesHourly } from './observatory'

describe('observatory pure functions', () => {
  it('formatPeriodRange daily shows date in Chinese', () => {
    const r = formatPeriodRange({ periodKey: '2026-07-20', periodStart: Date.UTC(2026, 6, 20), periodEnd: Date.UTC(2026, 6, 21) }, 'daily')
    expect(r).toBe('2026年7月20日')
  })

  it('formatPeriodRange weekly shows date range', () => {
    const r = formatPeriodRange({ periodKey: '2026-07-20', periodStart: Date.UTC(2026, 6, 20), periodEnd: Date.UTC(2026, 6, 27) }, 'weekly')
    expect(r).toContain('—')
  })

  it('getTrendText more than last week', () => {
    expect(getTrendText(7200, 5400)).toContain('比上周延伸了')
  })

  it('getTrendText less than last week', () => {
    expect(getTrendText(5400, 7200)).toContain('比上周短了')
  })

  it('getTrendText same as last week', () => {
    expect(getTrendText(7200, 7200)).toContain('相近的星轨')
  })

  it('getTrendText previous zero', () => {
    expect(getTrendText(7200, 0)).toContain('星图还没有形成清晰轨迹')
  })

  it('mapReturnKindLabel all kinds', () => {
    expect(mapReturnKindLabel('brief')).toBe('短途折返')
    expect(mapReturnKindLabel('short')).toBe('短程归来')
    expect(mapReturnKindLabel('expedition')).toBe('正式远征')
    expect(mapReturnKindLabel('deep')).toBe('深入远征')
  })

  it('calculateBarHeights normalizes to percentages', () => {
    const { heights, max } = calculateBarHeights([0, 3600, 7200, 0, 1800, 0, 0])
    expect(max).toBe(7200)
    expect(heights[2]).toBe(100)
    expect(heights[1]).toBe(50)
    expect(heights[0]).toBe(0)
  })

  it('calculateBarHeights all zeros returns zero heights', () => {
    const { heights, max } = calculateBarHeights([0, 0, 0, 0, 0, 0, 0])
    expect(max).toBe(1)
    heights.forEach(h => expect(h).toBe(0))
  })

  it('formatSessionCounts shows relevant types', () => {
    const parts = formatSessionCounts({ brief: 0, short: 1, expedition: 2, deep: 1 })
    expect(parts).toContain('深入远征 1')
    expect(parts).toContain('正式远征 2')
    expect(parts).toContain('短程归来 1')
    expect(parts).not.toContain('短途折返')
  })

  it('formatSessionCounts empty returns fallback', () => {
    expect(formatSessionCounts({ brief: 0, short: 0, expedition: 0, deep: 0 })).toEqual(['暂无记录'])
  })
})
