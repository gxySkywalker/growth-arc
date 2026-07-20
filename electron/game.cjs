const crypto = require('node:crypto')

const COMPANION_SPECIES = [
  {
    id: 'hearth_hound',
    name: '炉边小猎犬',
    kind: '小狗',
    rarity: 'starter',
    palette: 'honey',
    description: '喜欢蜷在壁炉旁，也愿意陪你走进任何一条陌生小路。',
    stages: ['绒耳幼犬', '篝火猎犬', '炉心守卫'],
    evolutions: [
      { id: 'hearth_guard', name: '炉心守卫', note: '更喜欢守护营地与同伴。' },
      { id: 'moon_trail', name: '月径猎犬', note: '更向往夜色中的远方。' },
    ],
  },
  {
    id: 'ember_drake',
    name: '余烬古龙',
    kind: '古龙',
    rarity: 'rare',
    palette: 'ember',
    description: '体内留着古老火焰，对宝藏和旧书有同样浓厚的兴趣。',
    stages: ['火种幼龙', '赤铜翼龙', '古焰龙王'],
    evolutions: [
      { id: 'archive_dragon', name: '书库守龙', note: '守护知识与古老卷册。' },
      { id: 'sky_dragon', name: '天穹寻宝龙', note: '追逐云层之上的遗迹。' },
    ],
  },
  {
    id: 'moss_fox',
    name: '苔原小狐',
    kind: '狐狸',
    rarity: 'common',
    palette: 'moss',
    description: '脚步很轻，总能从石缝里找到被遗漏的东西。',
    stages: ['苔尾幼狐', '遗迹灵狐', '翠影领路者'],
    evolutions: [
      { id: 'grove_fox', name: '翠影领路者', note: '熟悉森林里的每条暗路。' },
      { id: 'ruin_fox', name: '遗迹寻踪者', note: '擅长发现古堡的机关。' },
    ],
  },
  {
    id: 'moon_owl',
    name: '月塔猫头鹰',
    kind: '猫头鹰',
    rarity: 'common',
    palette: 'moon',
    description: '在高塔窗沿安静观察，偶尔带回写满批注的纸页。',
    stages: ['圆羽雏鸟', '银羽学士', '月塔贤者'],
    evolutions: [
      { id: 'moon_sage', name: '月塔贤者', note: '善于整理复杂的线索。' },
      { id: 'night_scout', name: '夜空巡游者', note: '能在夜色中看见很远。' },
    ],
  },
  {
    id: 'river_otter',
    name: '河湾水獭',
    kind: '水獭',
    rarity: 'common',
    palette: 'river',
    description: '随身带着一块最喜欢的圆石，做事认真又快活。',
    stages: ['圆石幼獭', '溪流旅伴', '河湾领航员'],
    evolutions: [
      { id: 'river_guide', name: '河湾领航员', note: '能读懂水流和天气。' },
      { id: 'pearl_keeper', name: '珍珠收藏家', note: '喜欢保存细小而重要的发现。' },
    ],
  },
  {
    id: 'cloud_rabbit',
    name: '云丘垂耳兔',
    kind: '兔子',
    rarity: 'rare',
    palette: 'cloud',
    description: '看起来软绵绵的，跑起来却像山风一样快。',
    stages: ['云团幼兔', '风铃旅兔', '云丘信使'],
    evolutions: [
      { id: 'cloud_courier', name: '云丘信使', note: '把好消息送到很远的地方。' },
      { id: 'storm_runner', name: '风暴疾行者', note: '越是艰难的天气越有精神。' },
    ],
  },
  {
    id: 'iron_badger',
    name: '铁砧獾',
    kind: '獾',
    rarity: 'rare',
    palette: 'iron',
    description: '沉默可靠，会把普通材料打磨成值得珍藏的物件。',
    stages: ['灰爪幼獾', '铜锤工匠', '王城铸造师'],
    evolutions: [
      { id: 'royal_smith', name: '王城铸造师', note: '擅长修复古老器物。' },
      { id: 'mountain_warden', name: '山门守卫', note: '拥有让人安心的力量。' },
    ],
  },
  {
    id: 'glimmer_cat',
    name: '烛影小猫',
    kind: '猫',
    rarity: 'rare',
    palette: 'violet',
    description: '总在烛光照不到的地方出现，尾巴尖像一粒星火。',
    stages: ['烛芯幼猫', '暮色灵猫', '星烛漫游者'],
    evolutions: [
      { id: 'star_candle', name: '星烛漫游者', note: '能在黑暗里点起细小星光。' },
      { id: 'velvet_shadow', name: '天鹅绒夜行者', note: '喜欢安静陪伴漫长的夜晚。' },
    ],
  },
]

const LOOT = [
  { id: 'copper_coin', name: '旧王朝铜币', rarity: 'common', icon: 'coin', description: '边缘已经磨圆，仍能看见王冠的纹样。' },
  { id: 'map_scrap', name: '手绘地图碎片', rarity: 'common', icon: 'map', description: '拼起来也许能通向下一座遗迹。' },
  { id: 'herb_bundle', name: '山野药草束', rarity: 'common', icon: 'herb', description: '带着太阳晒过后的清香。' },
  { id: 'berry_bread', name: '莓果旅行面包', rarity: 'common', icon: 'bread', description: '伙伴们很喜欢的远征口粮。' },
  { id: 'amber_chip', name: '蜜色琥珀碎片', rarity: 'common', icon: 'gem', description: '靠近壁炉时会微微发亮。' },
  { id: 'moon_compass', name: '月银罗盘', rarity: 'rare', icon: 'compass', description: '指针不朝北方，只朝向仍未发现的宝藏。' },
  { id: 'dragon_scale', name: '古龙鳞片', rarity: 'rare', icon: 'scale', description: '温热而坚硬，来自很久以前的一次蜕鳞。' },
  { id: 'star_glass', name: '星辉玻璃', rarity: 'rare', icon: 'star', description: '无论白天黑夜，里面都像装着一小片星空。' },
  { id: 'silver_bell', name: '旅者银铃', rarity: 'rare', icon: 'bell', description: '只有新朋友靠近时才会响起。' },
]

const LOCATIONS = ['长满常春藤的旧城门', '松林深处的石桥', '山脚下的废弃驿站', '河谷旁的圆顶塔楼', '风车丘陵的古道', '王城外的莓果林']
const EVENTS = [
  '你们沿着旧路前进，在黄昏前找到了安全的返程标记。',
  '伙伴在一块松动的石砖旁停下，下面藏着前人留下的小包裹。',
  '一阵短雨让道路变得泥泞，你们在树下等候，也因此发现了新的岔路。',
  '远处传来钟声，伙伴抬起头，记住了回到营地的方向。',
  '你们与一支旅行商队擦肩而过，对方分享了一条通往遗迹的小路。',
  '伙伴一路紧跟在身旁。没有惊险的大事，却是一段让人安心的同行。',
]

const DURATION_TIERS = [
  { min: 90, id: 'epic', name: '史诗远征', commonCount: 3, rareChance: 0.20, companionChance: 0.14 },
  { min: 60, id: 'deep', name: '深层探索', commonCount: 2, rareChance: 0.15, companionChance: 0.11 },
  { min: 45, id: 'ruins', name: '遗迹深入', commonCount: 2, rareChance: 0.10, companionChance: 0.09 },
  { min: 25, id: 'standard', name: '标准远征', commonCount: 1, rareChance: 0.06, companionChance: 0.07 },
  { min: 15, id: 'short', name: '林间短途', commonCount: 1, rareChance: 0.03, companionChance: 0.05 },
  { min: 5, id: 'scout', name: '营地侦察', commonCount: 1, rareChance: 0.01, companionChance: 0.02 },
  { min: 0, id: 'brief', name: '门外散步', commonCount: 1, rareChance: 0, companionChance: 0 },
]

function durationTier(activeSeconds) {
  const minutes = Math.max(0, Number(activeSeconds) || 0) / 60
  return DURATION_TIERS.find((tier) => minutes >= tier.min)
}

function seededRandom(seed) {
  let state = crypto.createHash('sha256').update(String(seed)).digest().readUInt32LE(0) || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
}

function rollExpedition({ sessionId, activeSeconds, rarePity = 0, companionPity = 0, ownedSpeciesIds = [], rareBoost = false }) {
  const tier = durationTier(activeSeconds)
  const random = seededRandom(String(sessionId) + ':' + activeSeconds)
  const common = LOOT.filter((item) => item.rarity === 'common')
  const rare = LOOT.filter((item) => item.rarity === 'rare')
  const drops = []
  for (let index = 0; index < tier.commonCount; index += 1) {
    const item = common[Math.floor(random() * common.length)]
    const existing = drops.find((drop) => drop.item.id === item.id)
    if (existing) existing.quantity += 1
    else drops.push({ item, quantity: 1 })
  }

  const boost = rareBoost ? 0.10 : 0
  const rareChance = Math.min(0.65, tier.rareChance + Math.max(0, Number(rarePity) - 4) * 0.03 + boost)
  const rareFound = tier.rareChance > 0 && (Number(rarePity) >= 9 || random() < rareChance)
  if (rareFound) drops.push({ item: rare[Math.floor(random() * rare.length)], quantity: 1 })

  const unowned = COMPANION_SPECIES.filter((species) => !ownedSpeciesIds.includes(species.id) && species.id !== 'hearth_hound')
  const companionChance = Math.min(0.55, tier.companionChance + Math.max(0, Number(companionPity) - 3) * 0.025)
  const companionSpecies = unowned.length && tier.companionChance > 0 && (Number(companionPity) >= 7 || random() < companionChance)
    ? unowned[Math.floor(random() * unowned.length)]
    : null

  return {
    tier,
    location: LOCATIONS[Math.floor(random() * LOCATIONS.length)],
    event: EVENTS[Math.floor(random() * EVENTS.length)],
    drops,
    rareFound,
    rareChance,
    companionSpecies,
    companionChance,
    bondXp: Math.max(1, Math.floor(Math.min(90, Math.max(1, activeSeconds / 60)) / 5)),
  }
}

function companionStage(bondXp, evolutionPath = '') {
  if (evolutionPath && Number(bondXp) >= 80) return 2
  if (Number(bondXp) >= 20) return 1
  return 0
}

function evolutionReady(bondXp, evolutionPath = '') {
  return Number(bondXp) >= 80 && !evolutionPath
}

const BRIEF_LOCATIONS = ['小屋门前', '城镇路口', '营地附近', '旧路起点']
const BRIEF_EVENTS = [
  '你出门透了口气，把刚才完成的部分记下便回来了。',
  '和伙伴走到路口。阳光正好，小屋的灯还看得见。',
  '你在周围转了一圈，确认今天的记录都妥当了。',
  '旧路还是记忆里的样子。你把已经完成的部分标记清楚。',
]

const SHORT_LOCATIONS = ['林间入口', '营地外缘', '城镇近郊', '旧路浅段', '松林小径']
const SHORT_EVENTS = [
  '你暂时停下脚步，把今天的笔记整理好。',
  '灌木丛里开了一小片花，伙伴低头嗅了嗅。',
  '路旁的石碑刻着模糊的字迹，像是很久以前留下的。',
  '你们沿着旧路走了一小截。空气里带着淡淡的松脂气味。',
  '伙伴在路口蹲下，好像在等你有空再往前走。',
]

function rollLightweightExpedition({ sessionId, activeSeconds, returnKind }) {
  const tier = durationTier(activeSeconds)
  const random = seededRandom(String(sessionId) + ':' + activeSeconds)
  const locPool = returnKind === 'brief' ? BRIEF_LOCATIONS : SHORT_LOCATIONS
  const evtPool = returnKind === 'brief' ? BRIEF_EVENTS : SHORT_EVENTS
  return {
    tier,
    location: locPool[Math.floor(random() * locPool.length)],
    event: evtPool[Math.floor(random() * evtPool.length)],
    drops: [],
    rareFound: false,
    rareChance: 0,
    companionChance: 0,
    bondXp: 0,
    activeCompanion: null,
    newCompanion: null,
  }
}

module.exports = {
  COMPANION_SPECIES,
  LOOT,
  DURATION_TIERS,
  BRIEF_LOCATIONS,
  BRIEF_EVENTS,
  SHORT_LOCATIONS,
  SHORT_EVENTS,
  durationTier,
  rollExpedition,
  rollLightweightExpedition,
  companionStage,
  evolutionReady,
}
