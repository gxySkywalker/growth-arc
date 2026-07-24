const crypto = require('node:crypto')

const COMPANION_SPECIES = [
  {
    id: 'hearth_hound',
    name: '炉尾',
    kind: '边境同行犬',
    rarity: 'starter',
    palette: 'honey',
    finalGrowthMode: 'time_branch',
    description: '与你走过抵达边境前的旧路。它记得回家的方向，也记得总要回头确认你是否跟在身后。',
    stages: ['炉尾', '栗鬃', '长成'],
    evolutions: [
      { id: 'ember_tail', name: '炭尾', note: '在白日的炉火与归途中长成。' },
      { id: 'pine_shadow', name: '松影', note: '在傍晚的风与林影之间长成。' },
      { id: 'moon_paw', name: '月爪', note: '在夜色、地图与远路旁长成。' },
    ],
  },
  {
    id: 'ember_drake',
    name: '余烬古龙',
    kind: '余烬古龙',
    defaultNickname: '小火牙',
    rarity: 'rare',
    palette: 'ember',
    finalGrowthMode: 'single',
    description: '栖在边境群山与未完整绘入地图的山脊。它不带人飞向远方，只让人学会敬意地看见未知。',
    stages: ['小火牙', '赤翼龙', '余烬古龙'],
    evolutions: [
      { id: 'ember_drake', name: '余烬古龙', note: '把与你一起看过、尚未抵达的远方，留成温暖而克制的记忆。' },
    ],
  },
  {
    id: 'moss_fox',
    name: '枝绒',
    kind: '林缘小狐',
    defaultNickname: '苔芽',
    rarity: 'common',
    palette: 'moss',
    finalGrowthMode: 'single',
    description: '住在林缘的苔石与树根之间。它不带路，只会让你看见林中悄悄变换的风、叶与水痕。',
    stages: ['枝绒', '苔亚', '森冠'],
    evolutions: [
      { id: 'forest_crown', name: '森冠', note: '和旅人一起学会留意森林中每一次细微的变化。' },
    ],
  },
  {
    id: 'moon_owl',
    name: '暮羽子',
    kind: '月塔鸮',
    defaultNickname: '暮羽子',
    rarity: 'common',
    palette: 'moon',
    finalGrowthMode: 'single',
    description: '栖在旧塔与书塔的高处。它不替人找答案，只让人愿意把夜里尚未说出口的念头安静留下。',
    stages: ['暮羽子', '咕夜枭', '冥翔鹰鸮'],
    evolutions: [
      { id: 'dusk_owl', name: '冥翔鹰鸮', note: '把与你一起停过的夜色，留成一页安静的远望。' },
    ],
  },
  {
    id: 'river_otter',
    name: '涟牙',
    kind: '河湾水獭',
    defaultNickname: '涟牙',
    rarity: 'common',
    palette: 'river',
    finalGrowthMode: 'single',
    description: '常在河湾、浅滩与旧石桥旁停留。它不带人渡河，只陪人听水流经过石缝的声音。',
    stages: ['涟牙', '漪爪', '湾澜'],
    evolutions: [
      { id: 'bay_current', name: '湾澜', note: '把与你一起停留过的河岸，留成一段缓慢流动的时间。' },
    ],
  },
  {
    id: 'cloud_rabbit',
    name: '云丘垂耳兔',
    kind: '云丘垂耳兔',
    defaultNickname: '小丘',
    rarity: 'rare',
    palette: 'cloud',
    finalGrowthMode: 'single',
    description: '住在开阔丘陵与风车古道旁。它不催人追上远方，只陪人知道慢一点也没有关系。',
    stages: ['小丘', '云丘兔', '风茸旅兔'],
    evolutions: [
      { id: 'wind_tuft_rabbit', name: '风茸旅兔', note: '把与你一起慢慢走过的开阔草坡，留成不必着急的陪伴。' },
    ],
  },
  {
    id: 'iron_badger',
    name: '石铁獾',
    kind: '石铁獾',
    defaultNickname: '小石獾',
    rarity: 'rare',
    palette: 'iron',
    finalGrowthMode: 'single',
    description: '住在旧石阶、山脚与石墙旁。它不替人锻造什么，只会让人留意脚下仍被好好放稳的石头。',
    stages: ['小石獾', '岩甲獾', '铠獾王'],
    evolutions: [
      { id: 'armor_king', name: '铠獾王', note: '把一起走过的崎岖路段，留成安稳的陪伴。' },
    ],
  },
  {
    id: 'glimmer_cat',
    name: '灯团',
    kind: '夜灯小猫',
    defaultNickname: '灯团',
    rarity: 'rare',
    palette: 'violet',
    finalGrowthMode: 'single',
    description: '常在小镇的窗台与夜灯旁停留。它的尾端像一盏安静的小灯，不替人照路，只陪人待过夜色。',
    stages: ['灯团', '星烛', '夜璃'],
    evolutions: [
      { id: 'night_glass', name: '夜璃', note: '把与你共处的安静，留成一盏稳定的灯。' },
    ],
  },
]

const LOOT = [
  { id: 'copper_coin', name: '旧王朝铜币', rarity: 'common', icon: 'coin', description: '边缘已经磨圆，仍能看见王冠的纹样。将来能与城镇和商队交易。' },
  { id: 'map_scrap', name: '手绘地图碎片', rarity: 'common', icon: 'map', description: '拼齐十张，可以开通一处新的远征地点。' },
  { id: 'herb_bundle', name: '山野药草束', rarity: 'common', icon: 'herb', description: '带着太阳晒过后的清香。十束可熬成药汤，为将来生病的伙伴准备。' },
  { id: 'berry_bread', name: '莓果旅行面包', rarity: 'common', icon: 'bread', description: '伙伴们很喜欢的远征口粮。' },
  { id: 'river_stone', name: '河岸圆石', rarity: 'uncommon', icon: 'wave', description: '被河水磨得温润圆滑。涟牙会把它悄悄排在身边。' },
  { id: 'wind_hill_feather', name: '风丘羽毛', rarity: 'uncommon', icon: 'star', description: '沾着高处风声的羽毛。暮羽子会在夜里认出它。' },
  { id: 'amber_chip', name: '蜜色琥珀碎片', rarity: 'rare', icon: 'gem', description: '靠近壁炉时会微微发亮。十枚可在火炉合成珍稀蜜色琥珀。' },
  { id: 'moon_compass', name: '月银罗盘', rarity: 'rare', icon: 'compass', description: '指针不朝北方，只朝向仍未发现的宝藏。' },
  { id: 'dragon_scale', name: '古龙鳞片', rarity: 'rare', icon: 'scale', description: '温热而坚硬，来自很久以前的一次蜕鳞。' },
  { id: 'star_glass', name: '星辉玻璃', rarity: 'rare', icon: 'star', description: '无论白天黑夜，里面都像装着一小片星空。' },
  { id: 'silver_bell', name: '旅者银铃', rarity: 'precious', icon: 'bell', description: '只有新朋友靠近时才会响起；铃声会一直留到相遇发生。' },
  { id: 'ancient_tower_page', name: '古塔残页', rarity: 'precious', icon: 'book', description: '残页边缘写着尚未辨认的塔名。' },
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
  { min: 90, id: 'epic', name: '史诗远征', commonCount: 3, uncommonChance: 0.22, rareChance: 0.20, preciousChance: 0.03, companionChance: 0.05 },
  { min: 60, id: 'deep', name: '深层探索', commonCount: 2, uncommonChance: 0.18, rareChance: 0.15, preciousChance: 0.02, companionChance: 0.03 },
  { min: 45, id: 'ruins', name: '遗迹深入', commonCount: 2, uncommonChance: 0.14, rareChance: 0.10, preciousChance: 0.012, companionChance: 0.01 },
  { min: 25, id: 'standard', name: '标准远征', commonCount: 1, uncommonChance: 0.10, rareChance: 0.06, preciousChance: 0.008, companionChance: 0.005 },
  { min: 15, id: 'short', name: '林间短途', commonCount: 1, uncommonChance: 0.07, rareChance: 0.03, preciousChance: 0.004, companionChance: 0.001 },
  { min: 5, id: 'scout', name: '营地侦察', commonCount: 1, uncommonChance: 0.04, rareChance: 0.01, preciousChance: 0.002, companionChance: 0.0001 },
  { min: 0, id: 'brief', name: '门外散步', commonCount: 1, uncommonChance: 0, rareChance: 0, preciousChance: 0, companionChance: 0 },
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

function rollExpedition({ sessionId, activeSeconds, rarePity = 0, companionPity = 0, ownedSpeciesIds = [], rareBoost = false, nightRareBoost = false, companionBoost = false }) {
  const tier = durationTier(activeSeconds)
  const random = seededRandom(String(sessionId) + ':' + activeSeconds)
  const common = LOOT.filter((item) => item.rarity === 'common')
  const uncommon = LOOT.filter((item) => item.rarity === 'uncommon')
  const rare = LOOT.filter((item) => item.rarity === 'rare')
  const precious = LOOT.filter((item) => item.rarity === 'precious')
  const drops = []
  for (let index = 0; index < tier.commonCount; index += 1) {
    const item = common[Math.floor(random() * common.length)]
    const existing = drops.find((drop) => drop.item.id === item.id)
    if (existing) existing.quantity += 1
    else drops.push({ item, quantity: 1 })
  }

  if (tier.uncommonChance > 0 && random() < tier.uncommonChance) drops.push({ item: uncommon[Math.floor(random() * uncommon.length)], quantity: 1 })
  const boost = (rareBoost ? 0.10 : 0) + (nightRareBoost ? 0.03 : 0)
  const rareChance = Math.min(0.65, tier.rareChance + Math.max(0, Number(rarePity) - 4) * 0.03 + boost)
  const rareFound = tier.rareChance > 0 && (Number(rarePity) >= 9 || random() < rareChance)
  if (rareFound) drops.push({ item: rare[Math.floor(random() * rare.length)], quantity: 1 })
  const preciousFound = tier.preciousChance > 0 && random() < tier.preciousChance
  if (preciousFound) drops.push({ item: precious[Math.floor(random() * precious.length)], quantity: 1 })

  const unowned = COMPANION_SPECIES.filter((species) => !ownedSpeciesIds.includes(species.id) && species.id !== 'hearth_hound')
  const companionChance = Math.min(0.50, tier.companionChance + Math.max(0, Number(companionPity) - 4) * 0.01 + (companionBoost ? 0.10 : 0))
  const companionSpecies = unowned.length && tier.companionChance > 0 && random() < companionChance
    ? unowned[Math.floor(random() * unowned.length)]
    : null

  return {
    tier,
    location: LOCATIONS[Math.floor(random() * LOCATIONS.length)],
    event: EVENTS[Math.floor(random() * EVENTS.length)],
    drops,
    rareFound,
    preciousFound,
    rareChance,
    companionSpecies,
    companionChance,
    bondXp: Math.max(1, Math.floor(Math.min(90, Math.max(1, activeSeconds / 60)) / 5)),
  }
}

function companionStage(bondXp) {
  if (Number(bondXp) >= 200) return 2
  if (Number(bondXp) >= 100) return 1
  return 0
}

function evolutionReady(bondXp, evolutionPath = '') {
  return Number(bondXp) >= 200 && !evolutionPath
}

function growthPathForTime(timestamp = Date.now()) {
  const hour = new Date(timestamp).getHours()
  if (hour >= 6 && hour < 16) return 'ember_tail'
  if (hour >= 16 && hour < 20) return 'pine_shadow'
  return 'moon_paw'
}

// The species owns its final-growth rule. Chestnut is the only current
// time-branching companion; a single-route companion must never inherit one
// of Chestnut's names merely because it happened to reach 200 bond at night.
function growthPathForCompanion(speciesId, timestamp = Date.now()) {
  const species = COMPANION_SPECIES.find((item) => item.id === speciesId)
  if (!species) return ''
  if (species.finalGrowthMode === 'single') return species.evolutions?.[0]?.id || ''
  if (species.finalGrowthMode === 'time_branch') return growthPathForTime(timestamp)
  return ''
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
  growthPathForTime,
  growthPathForCompanion,
}
