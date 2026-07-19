import type { LootItem } from '../types'

interface ItemLore {
  effectLabel: string | null   // null = 尚未实现
  consumesItem: boolean
  xpAwarded: number | null
}

const LORE: Record<string, ItemLore> = {
  copper_coin:     { effectLabel: '旅途经验 +5',     consumesItem: true, xpAwarded: 5 },
  map_scrap:       { effectLabel: '下次远征稀有发现概率提升', consumesItem: true, xpAwarded: null },
  berry_bread:     { effectLabel: '同行伙伴羁绊 +10', consumesItem: true, xpAwarded: null },
  herb_bundle:     { effectLabel: null,              consumesItem: false, xpAwarded: null },
  amber_chip:      { effectLabel: null,              consumesItem: false, xpAwarded: null },
  moon_compass:    { effectLabel: null,              consumesItem: false, xpAwarded: null },
  dragon_scale:    { effectLabel: null,              consumesItem: false, xpAwarded: null },
  star_glass:      { effectLabel: null,              consumesItem: false, xpAwarded: null },
  silver_bell:     { effectLabel: null,              consumesItem: false, xpAwarded: null },
}

export function getItemLore(item: Pick<LootItem, 'id'>): ItemLore {
  return LORE[item.id] || { effectLabel: null, consumesItem: false, xpAwarded: null }
}
