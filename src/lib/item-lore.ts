import type { LootItem } from '../types'

interface ItemLore {
  effectLabel: string | null
  consumesItem: boolean
  xpAwarded: number | null
  collectible?: boolean
}

const LORE: Record<string, ItemLore> = {
  copper_coin:       { effectLabel: '未来可与城镇及商队交易', consumesItem: false, xpAwarded: null, collectible: true },
  map_scrap:         { effectLabel: '集齐 10 张后开通新的远征地点', consumesItem: false, xpAwarded: null, collectible: true },
  herb_bundle:       { effectLabel: '集齐 10 束后可熬制伙伴药汤', consumesItem: false, xpAwarded: null, collectible: true },
  berry_bread:       { effectLabel: '当前同行伙伴羁绊 +1', consumesItem: true, xpAwarded: null },
  river_stone:       { effectLabel: '涟牙及其成长形态羁绊 +3', consumesItem: true, xpAwarded: null },
  wind_hill_feather: { effectLabel: '暮羽子及其成长形态羁绊 +3', consumesItem: true, xpAwarded: null },
  amber_chip:        { effectLabel: '集齐 10 枚后可经火炉合成珍稀蜜色琥珀', consumesItem: false, xpAwarded: null, collectible: true },
  moon_compass:      { effectLabel: '夜晚使用：至次日 06:00，稀有发现概率 +3%', consumesItem: true, xpAwarded: null },
  dragon_scale:      { effectLabel: '小火牙及其成长形态羁绊 +3', consumesItem: true, xpAwarded: null },
  star_glass:        { effectLabel: '下一次正式远征稀有发现概率 +10%', consumesItem: true, xpAwarded: null },
  silver_bell:       { effectLabel: '使用后消失：新伙伴相遇概率 +10%，直至相遇发生', consumesItem: true, xpAwarded: null },
  ancient_tower_page:{ effectLabel: '古塔的线索仍待解读', consumesItem: false, xpAwarded: null, collectible: true },
}

export function getItemLore(item: Pick<LootItem, 'id'>): ItemLore {
  return LORE[item.id] || { effectLabel: null, consumesItem: false, xpAwarded: null, collectible: true }
}
