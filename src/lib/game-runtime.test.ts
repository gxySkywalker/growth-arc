import { describe, expect, it } from 'vitest'
// @ts-expect-error The Electron game module is CommonJS and intentionally shared with tests.
import game from '../../electron/game.cjs'

const { durationTier, rollExpedition, companionStage, evolutionReady } = game

describe('expedition rules', () => {
  it('improves reward tiers with healthy duration caps', () => {
    expect(durationTier(5 * 60).id).toBe('scout')
    expect(durationTier(45 * 60).rareChance).toBe(0.10)
    expect(durationTier(90 * 60).rareChance).toBe(0.20)
    expect(durationTier(240 * 60).rareChance).toBe(0.20)
  })

  it('is deterministic and guarantees pity rewards', () => {
    const first = rollExpedition({ sessionId: 'same-session', activeSeconds: 45 * 60, rarePity: 9, companionPity: 7, ownedSpeciesIds: ['hearth_hound'] })
    const second = rollExpedition({ sessionId: 'same-session', activeSeconds: 45 * 60, rarePity: 9, companionPity: 7, ownedSpeciesIds: ['hearth_hound'] })
    expect(second).toEqual(first)
    expect(first.rareFound).toBe(true)
    expect(first.companionSpecies).not.toBeNull()
  })

  it('uses bond milestones for visible growth and chosen evolution', () => {
    expect(companionStage(19)).toBe(0)
    expect(companionStage(20)).toBe(1)
    expect(evolutionReady(80)).toBe(true)
    expect(companionStage(80, 'moon_trail')).toBe(2)
  })
})
