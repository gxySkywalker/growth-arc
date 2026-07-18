import { describe, expect, it } from 'vitest'
import { getCottageInteraction, isNearCottageCompanion, resolveCottageMove } from './cottage-scene'

describe('cottage movement', () => {
  it('moves in four-pixel steps with WASD and arrow keys', () => {
    expect(resolveCottageMove({ x: 100, y: 80 }, 'd')?.position).toEqual({ x: 104, y: 80 })
    expect(resolveCottageMove({ x: 100, y: 80 }, 'ArrowUp')?.position).toEqual({ x: 100, y: 76 })
  })

  it('keeps the player inside the walkable room', () => {
    expect(resolveCottageMove({ x: 4, y: 30 }, 'a')?.position).toEqual({ x: 4, y: 30 })
    expect(resolveCottageMove({ x: 284, y: 80 }, 'd')?.position).toEqual({ x: 284, y: 80 })
  })

  it('distinguishes the doorway from the south wall', () => {
    expect(resolveCottageMove({ x: 144, y: 132 }, 's')?.message).toContain('雪夜')
    expect(resolveCottageMove({ x: 40, y: 132 }, 's')?.message).toContain('南墙')
  })

  it('stops at furniture while keeping the interaction context', () => {
    const result = resolveCottageMove({ x: 80, y: 92 }, 'a')
    expect(result?.position).toEqual({ x: 80, y: 92 })
    expect(result?.message).toContain('书桌')
  })

  it('ignores keys that are not movement controls', () => {
    expect(resolveCottageMove({ x: 100, y: 80 }, 'Enter')).toBeNull()
  })

  it('stops before overlapping the companion and exposes an interaction state', () => {
    const result = resolveCottageMove({ x: 118, y: 78 }, 'd')
    expect(result?.position).toEqual({ x: 118, y: 78 })
    expect(result?.blockedBy).toBe('companion')
  })

  it('detects when the player is close enough to talk', () => {
    expect(isNearCottageCompanion({ x: 105, y: 78 })).toBe(true)
    expect(isNearCottageCompanion({ x: 20, y: 120 })).toBe(false)
  })

  it('finds keyboard interactions from the player foot position', () => {
    expect(getCottageInteraction({ x: 50, y: 105 })?.action).toBe('journal')
    expect(getCottageInteraction({ x: 50, y: 105 })?.prompt).toEqual({ x: 58, y: 91 })
    expect(getCottageInteraction({ x: 144, y: 132 })?.action).toBe('expedition')
    expect(getCottageInteraction({ x: 250, y: 30 })).toBeNull()
  })
})
