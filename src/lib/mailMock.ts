// STATIC PROTOTYPE MOCK — not connected to database or IPC.
// Replace with real IPC calls when mail:* handlers go live.

export type MockCategory = 'new' | 'daily' | 'weekly' | 'festival' | 'memorial' | 'world' | 'all'

export interface ObservatoryTarget {
  periodType: 'daily' | 'weekly'
  periodStart: string
  periodEnd: string
}

export interface MockLetter {
  id: string
  category: MockCategory
  subtype: string
  senderName: string
  subject: string
  body: string
  dateLabel: string
  occurredAt: string
  isRead: boolean
  hasReply: boolean
  replyText: string
  factSummary?: { focusMinutes?: number; waypointCount?: number; primaryDirection?: string }
  observatoryTarget?: ObservatoryTarget
}

export interface ObservatoryTarget {
  periodType: 'daily' | 'weekly'
  periodStart: string
  periodEnd: string
}

function dailyTarget(date: string): ObservatoryTarget { return { periodType: 'daily', periodStart: date, periodEnd: date } }
function weeklyTarget(monday: string, sunday: string): ObservatoryTarget { return { periodType: 'weekly', periodStart: monday, periodEnd: sunday } }

export function isPeriodicLetter(letter: MockLetter): boolean {
  return letter.category === 'daily' || letter.category === 'weekly'
}
export function canViewObservatory(letter: MockLetter): boolean { return isPeriodicLetter(letter) }
export function observatoryLinkLabel(letter: MockLetter): string {
  if (letter.category === 'daily') return '查看这一天的星图'
  if (letter.category === 'weekly') return '查看这一周的星图'
  return '查看本期星图'
}

const NEW_LETTERS: MockLetter[] = [
  {
    id: 'n1', category: 'daily', subtype: 'daily', senderName: '小天使',
    subject: '七月二十日的星页', dateLabel: '7月20日', occurredAt: '2026-07-20',
    body: '今天共专注 2 小时 14 分钟。完成了 3 个路标。主要的方向是通用学习。炉火旁安静地收好今天。',
    isRead: false, hasReply: false, replyText: '',
    observatoryTarget: dailyTarget('2026-07-20'),
    factSummary: { focusMinutes: 134, waypointCount: 3, primaryDirection: '通用学习' },
  },
  {
    id: 'n2', category: 'weekly', subtype: 'weekly', senderName: '小天使',
    subject: '七月第三周的来信', dateLabel: '7月14日', occurredAt: '2026-07-14',
    body: '本周共专注 6 小时 30 分钟。比上周延伸了 1 小时 12 分钟。3 次正式远征。主要方向是通用学习和编程。一周的足迹已经归档。愿新的星期带来安静的专注。',
    isRead: false, hasReply: false, replyText: '',
    observatoryTarget: weeklyTarget('2026-07-14', '2026-07-20'),
    factSummary: { focusMinutes: 390, waypointCount: 5, primaryDirection: '通用学习' },
  },
]

const DAILY_LETTERS: MockLetter[] = [
  {
    id: 'd1', category: 'daily', subtype: 'daily', senderName: '小天使',
    subject: '七月十九日的星页', dateLabel: '7月19日', occurredAt: '2026-07-19',
    body: '今天共专注 45 分钟。完成了 1 个路标。主要的方向是编程。小屋的灯还亮着。明天见。',
    isRead: true, hasReply: true, replyText: '谢谢小天使。',
    observatoryTarget: dailyTarget('2026-07-19'),
    factSummary: { focusMinutes: 45, waypointCount: 1, primaryDirection: '编程' },
  },
  {
    id: 'd2', category: 'daily', subtype: 'daily', senderName: '小天使',
    subject: '七月十八日的星页', dateLabel: '7月18日', occurredAt: '2026-07-18',
    body: '今天没有走远。抵达了 2 个路标。明天见。',
    isRead: true, hasReply: false, replyText: '',
    observatoryTarget: dailyTarget('2026-07-18'),
    factSummary: { focusMinutes: 8, waypointCount: 2, primaryDirection: '通用学习' },
  },
  {
    id: 'd3', category: 'daily', subtype: 'daily', senderName: '小天使',
    subject: '七月十七日的星页', dateLabel: '7月17日', occurredAt: '2026-07-17',
    body: '今天共专注 3 小时 12 分钟。完成了 4 个路标。主要的方向是通用学习。炉火旁安静地收好今天。',
    isRead: true, hasReply: false, replyText: '',
    observatoryTarget: dailyTarget('2026-07-17'),
    factSummary: { focusMinutes: 192, waypointCount: 4, primaryDirection: '通用学习' },
  },
  {
    id: 'd4', category: 'daily', subtype: 'daily', senderName: '小天使',
    subject: '七月十六日的星页', dateLabel: '7月16日', occurredAt: '2026-07-16',
    body: '天文台留下了一句话。今天有一段记录被收好。',
    isRead: true, hasReply: false, replyText: '',
    observatoryTarget: dailyTarget('2026-07-16'),
    factSummary: { focusMinutes: 0, waypointCount: 0 },
  },
  {
    id: 'd5', category: 'daily', subtype: 'daily', senderName: '小天使',
    subject: '七月十五日的星页', dateLabel: '7月15日', occurredAt: '2026-07-15',
    body: '今天共专注 1 小时 48 分钟。完成了 2 个路标。方向是通用学习。小屋的灯还亮着。',
    isRead: true, hasReply: false, replyText: '',
    observatoryTarget: dailyTarget('2026-07-15'),
    factSummary: { focusMinutes: 108, waypointCount: 2, primaryDirection: '通用学习' },
  },
]

const WEEKLY_LETTERS: MockLetter[] = [
  {
    id: 'w1', category: 'weekly', subtype: 'weekly', senderName: '小天使',
    subject: '七月第三周的来信', dateLabel: '7月14日', occurredAt: '2026-07-14',
    body: '本周共专注 6 小时 30 分钟。比上周延伸了 1 小时 12 分钟。3 次正式远征，2 次短程归来，1 次短途折返。完成了 5 个路标。投入最多的方向是通用学习。一周的足迹已经归档。愿新的星期带来安静的专注。',
    isRead: true, hasReply: false, replyText: '',
    observatoryTarget: weeklyTarget('2026-07-14', '2026-07-20'),
    factSummary: { focusMinutes: 390, waypointCount: 5, primaryDirection: '通用学习' },
  },
  {
    id: 'w2', category: 'weekly', subtype: 'weekly', senderName: '小天使',
    subject: '七月第二周的来信', dateLabel: '7月7日', occurredAt: '2026-07-07',
    body: '本周共专注 5 小时 18 分钟。比上周短了 42 分钟。2 次正式远征，1 次深入远征。完成了 4 个路标。主要方向是编程。把这些整理好放进旅途编年史里。新的一周也请多指教。',
    isRead: true, hasReply: false, replyText: '',
    observatoryTarget: weeklyTarget('2026-07-07', '2026-07-13'),
    factSummary: { focusMinutes: 318, waypointCount: 4, primaryDirection: '编程' },
  },
  {
    id: 'w3', category: 'weekly', subtype: 'weekly', senderName: '小天使',
    subject: '七月第一周的来信', dateLabel: '6月30日', occurredAt: '2026-06-30',
    body: '本周共专注 4 小时 0 分钟。上周的星图还没有形成清晰轨迹。2 次正式远征。完成了 3 个路标。投入最多的方向是通用学习。一周的足迹已经归档。',
    isRead: true, hasReply: false, replyText: '',
    observatoryTarget: weeklyTarget('2026-06-30', '2026-07-06'),
    factSummary: { focusMinutes: 240, waypointCount: 3, primaryDirection: '通用学习' },
  },
]

const FESTIVAL_LETTERS: MockLetter[] = [
  {
    id: 'f1', category: 'festival', subtype: 'returning_lights_opening', senderName: '小镇',
    subject: '归灯节的第一盏灯', dateLabel: '2025年11月7日', occurredAt: '2025-11-07',
    body: '归灯节到了。从今天开始，镇上的灯会一盏接一盏亮起来。无论你此刻走到了哪里，这些灯都会一直等到归灯夜。这几天不必急着赶路。节期里的每一盏灯，都是为了仍在路上的人。',
    isRead: true, hasReply: false, replyText: '',
    factSummary: undefined,
  },
  {
    id: 'f2', category: 'festival', subtype: 'returning_lights_climax', senderName: '小镇',
    subject: '归灯夜的灯火', dateLabel: '2025年11月15日', occurredAt: '2025-11-15',
    body: '今晚是归灯夜。每一扇窗都为仍在远方的人亮着灯。镇上的居民聚在广场上，把最大的提灯挂在钟楼旁。这些灯火不会问你走了多远、完成了多少路——它们只是亮着。等你想回来的时候，它们就在这里。',
    isRead: true, hasReply: true, replyText: '看到这些字觉得很温暖。',
    factSummary: undefined,
  },
]

const MEMORIAL_LETTERS: MockLetter[] = [
  {
    id: 'm1', category: 'memorial', subtype: 'birthday', senderName: '小镇',
    subject: '写给你的生日信', dateLabel: '2026年5月12日', occurredAt: '2026-05-12',
    body: '生日快乐。这是你在小镇度过的第一个生日。今天广场上的面包房烤了一炉蜂蜜蛋糕，艾达说这一块是留给你的。无论你今天有没有出门远征，这份祝福都已经是你的了。又长大了一岁，希望你在这里的每一天都像现在这样，走在自己的路上。',
    isRead: true, hasReply: true, replyText: '谢谢你记得。',
    factSummary: undefined,
  },
]

const WORLD_LETTERS: MockLetter[] = [
  {
    id: 'x1', category: 'world', subtype: 'resident', senderName: '艾达',
    subject: '艾达寄来的短信', dateLabel: '2026年6月20日', occurredAt: '2026-06-20',
    body: '主角，上次你说想修修小屋的窗户，我给你留了一块合适的玻璃板。放在你家门廊右边了。不是什么贵重东西，但秋天快来了，挡挡风正好。不用急着来谢我，有空再说。—— 艾达',
    isRead: true, hasReply: false, replyText: '',
    factSummary: undefined,
  },
]

const ALL_FLAT: MockLetter[] = [...NEW_LETTERS, ...DAILY_LETTERS, ...WEEKLY_LETTERS, ...FESTIVAL_LETTERS, ...MEMORIAL_LETTERS, ...WORLD_LETTERS]
const byCategory = (cat: MockCategory) => ALL_FLAT.filter(l => l.category === cat)

export const MOCK_LETTERS = {
  new: NEW_LETTERS,
  daily: byCategory('daily'),
  weekly: byCategory('weekly'),
  festival: byCategory('festival'),
  memorial: byCategory('memorial'),
  world: byCategory('world'),
  all: ALL_FLAT,
} as const

export const CATEGORY_LABELS: Record<MockCategory, string> = {
  new: '新到来信',
  daily: '每日来信',
  weekly: '每周来信',
  festival: '节庆来信',
  memorial: '纪念来信',
  world: '远方来信',
  all: '所有来信',
}
