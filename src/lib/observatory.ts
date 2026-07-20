import { formatDuration } from './format'
import type { SessionCounts } from '../types'

export function formatPeriodRange(period: { periodKey: string; periodStart: number; periodEnd: number }, type: 'daily' | 'weekly'): string {
  if (type === 'daily') {
    const d = new Date(period.periodStart)
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }
  const start = new Date(period.periodStart)
  const end = new Date(period.periodEnd - 86400000)
  const fmt = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`
  return `${fmt(start)} — ${fmt(end)}`
}

export function formatDailyNavLabel(period: { periodKey: string; periodStart: number }): string {
  const d = new Date(period.periodStart)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function formatWeeklyNavLabel(period: { periodStart: number; periodEnd: number }): string {
  const start = new Date(period.periodStart)
  const end = new Date(period.periodEnd - 86400000)
  return `${start.getMonth() + 1}月${start.getDate()}日—${end.getMonth() + 1}月${end.getDate()}日`
}

export function getTrendText(current: number, previous: number): string {
  if (!previous) return '上周的星图还没有形成清晰轨迹。'
  const diff = current - previous
  if (diff === 0) return '这一周与上周留下了相近的星轨。'
  return diff > 0
    ? `这一周的星轨比上周延伸了${formatDuration(Math.abs(diff))}。`
    : `这一周的星轨比上周短了${formatDuration(Math.abs(diff))}。`
}

export function mapReturnKindLabel(kind: string): string {
  if (kind === 'brief') return '短途折返'
  if (kind === 'short') return '短程归来'
  if (kind === 'expedition') return '正式远征'
  if (kind === 'deep') return '深入远征'
  return kind || '未分类'
}

export function calculateBarHeights(dailySeconds: number[], maxVal?: number): { heights: number[]; max: number } {
  const max = maxVal !== undefined ? maxVal : Math.max(1, ...dailySeconds)
  return {
    heights: dailySeconds.map(v => Math.max(0, Math.round((v / Math.max(1, max)) * 100))),
    max,
  }
}

export function formatSessionCounts(counts: SessionCounts): string[] {
  const parts: string[] = []
  if (counts.deep > 0) parts.push(`深入远征 ${counts.deep}`)
  if (counts.expedition > 0) parts.push(`正式远征 ${counts.expedition}`)
  if (counts.short > 0) parts.push(`短程归来 ${counts.short}`)
  if (counts.brief > 0) parts.push(`短途折返 ${counts.brief}`)
  return parts.length ? parts : ['暂无记录']
}

export function heatLevel(s: number): 0 | 1 | 2 | 3 {
  if (s <= 0) return 0
  if (s < 600) return 1   // <10 min
  if (s < 1800) return 2  // <30 min
  return 3                  // >=30 min
}

export function formatMinutesHourly(s: number): string {
  if (s <= 0) return ''
  const m = Math.max(1, Math.round(s / 60))
  return m >= 60 ? '1h' : `${m}m`
}

export function formatPixelDuration(seconds: number): Array<{ text: string; isNumber: boolean }> {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const parts: Array<{ text: string; isNumber: boolean }> = []
  if (hours > 0) { parts.push({ text: String(hours), isNumber: true }); parts.push({ text: ' 小时 ', isNumber: false }) }
  if (minutes > 0 || hours === 0) { parts.push({ text: String(minutes), isNumber: true }); parts.push({ text: ' 分钟', isNumber: false }) }
  return parts
}

const TIME_WINDOWS = [
  { label: '深夜', hours: [0, 1, 2, 3, 4, 5] },
  { label: '清晨', hours: [6, 7, 8] },
  { label: '上午', hours: [9, 10, 11] },
  { label: '午后', hours: [12, 13, 14, 15, 16, 17] },
  { label: '晚间', hours: [18, 19, 20, 21, 22, 23] },
]

export function getDominantTimeWindow(hourlyData: number[]): { label: string; total: number } | null {
  if (!hourlyData || hourlyData.length !== 24) return null
  const sums = TIME_WINDOWS.map(w => ({
    label: w.label,
    total: w.hours.reduce((s, h) => s + (hourlyData[h] || 0), 0),
  }))
  const max = sums.reduce((m, w) => Math.max(m, w.total), 0)
  if (max === 0) return null
  return sums.find(w => w.total === max) || null
}

