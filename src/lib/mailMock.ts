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

export function isPeriodicLetter(letter: MockLetter): boolean {
  return letter.category === 'daily' || letter.category === 'weekly'
}
export function canViewObservatory(letter: MockLetter): boolean { return isPeriodicLetter(letter) }
export function observatoryLinkLabel(letter: MockLetter): string {
  if (letter.category === 'daily') return '查看这一天的星图'
  if (letter.category === 'weekly') return '查看这一周的星图'
  return '查看本期星图'
}

// ── Legacy mock data — retained for type reference only ──────
// All letter data now comes from SQLite via mail:* IPC.
// MOCK_LETTERS is no longer imported by any production code.
// Kept as type-safe reference for future test fixtures.

export const MOCK_LETTERS = {
  new: [] as MockLetter[],
  daily: [] as MockLetter[],
  weekly: [] as MockLetter[],
  festival: [] as MockLetter[],
  memorial: [] as MockLetter[],
  world: [] as MockLetter[],
  all: [] as MockLetter[],
} as const

export const CATEGORY_LABELS: Record<MockCategory, string> = {
  new: '新到来信',
  daily: '每日来信',
  weekly: '每周来信',
  festival: '节庆来信',
  memorial: '纪念来信',
  world: '友人来信',
  all: '所有来信',
}
