import type { WeeklyObservatoryData } from '../types'

export interface ObservationSummary {
  headline: string | null
  details: string[]
  tags: string[]
}

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function timeShare(hourly: number[]) {
  const groups = [
    { key: '深夜', label: '深夜', total: hourly.slice(0, 6).reduce((a, b) => a + b, 0) },
    { key: '清晨', label: '清晨', total: hourly.slice(6, 9).reduce((a, b) => a + b, 0) },
    { key: '上午', label: '上午', total: hourly.slice(9, 12).reduce((a, b) => a + b, 0) },
    { key: '午后', label: '午后', total: hourly.slice(12, 18).reduce((a, b) => a + b, 0) },
    { key: '晚间', label: '晚间', total: hourly.slice(18, 24).reduce((a, b) => a + b, 0) },
  ]
  const sum = groups.reduce((s, g) => s + g.total, 0)
  return groups.map(g => ({ ...g, share: sum > 0 ? g.total / sum : 0 }))
}

const HEADLINES: Record<string, string[]> = {
  '清晨': ['清晨的星图最先亮了起来。', '天光初现时，星轨便开始延伸。'],
  '上午': ['上午留下了这周最清晰的星光。', '日光升起后，远征逐渐展开。'],
  '午后': ['午后的星轨最为密集。', '这周的远征大多在午后展开。'],
  '晚间': ['夜色降临后，星图逐渐亮起。', '晚间留下了最多的星光。'],
  '深夜': ['深夜的星图最先亮了起来。', '夜深之后，星轨仍在继续延伸。'],
}

export function buildWeeklyObservationSummary(data: WeeklyObservatoryData): ObservationSummary {
  const flat = data.hourlyActiveSecondsByDay?.flat() || []
  const totalHourly = flat.reduce((a, b) => a + b, 0)
  const groups = timeShare(flat)
  const topTime = groups.reduce((best, g) => g.share > best.share ? g : best, groups[0])

  const daily = data.stats.dailyActiveSeconds
  const totalDaily = daily.reduce((a, b) => a + b, 0)
  let bestDayIdx = 0; let bestDayVal = 0
  daily.forEach((v, i) => { if (v > bestDayVal) { bestDayVal = v; bestDayIdx = i } })
  const bestDayShare = totalDaily > 0 ? bestDayVal / totalDaily : 0
  const nonZeroDays = daily.filter(v => v > 0).length

  const c = data.stats.sessionCounts
  const long = (c.deep || 0) + (c.expedition || 0)
  const short = (c.short || 0) + (c.brief || 0)
  const dirs = data.stats.directionBreakdown

  const result: ObservationSummary = { headline: null, details: [], tags: [] }

  // Headline — time of day
  if (totalHourly > 0 && topTime.share >= 0.30) {
    const pool = HEADLINES[topTime.key] || HEADLINES['深夜']
    result.headline = pool[Math.abs(topTime.total) % pool.length]
  } else if (totalHourly > 0) {
    const active = groups.filter(g => g.share >= 0.15)
    if (active.length >= 3) result.headline = '这一周的星光散落在不同的时辰。'
  }

  // Detail 1 — day
  if (totalDaily > 0) {
    if (nonZeroDays === 1) {
      result.details.push(`${DAY_LABELS[bestDayIdx]}留下了本周唯一一道清晰的星轨。`)
    } else if (bestDayShare >= 0.50) {
      result.details.push(`${DAY_LABELS[bestDayIdx]}留下了本周最长的一道星轨。`)
    } else if (nonZeroDays >= 3) {
      const close = daily.every(v => v === 0 || (v / Math.max(1, totalDaily)) < 0.35)
      if (close) result.details.push('各天留下的星光较为接近。')
      else result.details.push(`${DAY_LABELS[bestDayIdx]}的远征在这周最为漫长。`)
    }
  }

  // Detail 2 — pattern + direction
  if (long > 0 || short > 0) {
    if (long >= short * 1.5) {
      result.details.push('这周的星图，主要由几段较长的远征组成。')
      result.tags.push('长途跋涉')
    } else if (short >= long * 1.5) {
      result.details.push('许多短小的归程拼成了这一周的旅途。')
      result.tags.push('短途往返')
    } else {
      result.details.push('长途与短程交错，构成了这一周的路线。')
      result.tags.push('长短交错')
    }
    // Direction
    if (dirs.length > 0 && totalDaily > 0) {
      const top = dirs[0]
      const share = top.seconds / totalDaily
      if (share >= 0.70) {
        result.details.push(`大部分星轨都朝向「${top.name}」。`)
        result.tags.push('单线延伸')
      } else if (share >= 0.45) {
        if (dirs.length >= 2) {
          result.details.push(`「${top.name}」与「${dirs[1].name}」共同构成了这周的主要路线。`)
        } else {
          result.details.push(`「${top.name}」是这周延伸最远的一条路线。`)
        }
      } else if (dirs.length >= 3) {
        result.details.push('几条不同的路线同时在星图上延伸。')
        result.tags.push('多路探索')
      }
    }
  }

  // Tags — time window
  if (result.headline && topTime.share >= 0.30) {
    const tag = topTime.key === '深夜' ? '夜间星轨' : topTime.key === '午后' ? '午后远征' : `${topTime.key}出征`
    if (!result.tags.includes(tag)) result.tags.unshift(tag)
  }

  result.tags = result.tags.slice(0, 2)
  result.details = result.details.slice(0, 2)
  return result
}

export function dailySummaryNote(data: { hourlyActiveSeconds: number[]; directionBreakdown: Array<{ name: string; seconds: number }>; totalActiveSeconds: number }): string | null {
  const total = data.hourlyActiveSeconds?.reduce((a: number, b: number) => a + b, 0) || 0
  if (total === 0) return null

  const groups = timeShare(data.hourlyActiveSeconds)
  const top = groups.reduce((best, g) => g.share > best.share ? g : best, groups[0])

  if (top.share >= 0.40) {
    const pool = HEADLINES[top.key] || HEADLINES['深夜']
    const idx = Math.abs(top.total) % pool.length
    return pool[idx]
  }

  let maxRun = 0; let currentRun = 0
  for (let i = 0; i < 24; i++) {
    if ((data.hourlyActiveSeconds[i] || 0) > 0) { currentRun++; maxRun = Math.max(maxRun, currentRun) }
    else currentRun = 0
  }
  if (maxRun >= 3) return '今天有一段较长的连续远征。'

  const dirs = data.directionBreakdown
  if (dirs.length > 0 && data.totalActiveSeconds > 0 && dirs[0].seconds / data.totalActiveSeconds >= 0.6) {
    return `大部分星轨都朝向「${dirs[0].name}」。`
  }

  const active = data.hourlyActiveSeconds.filter(v => v > 0).length
  if (active >= 4) return '今天的足迹散落在几个不同的时辰。'
  if (active > 0) return null
  return null
}
