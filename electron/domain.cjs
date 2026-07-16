const ACHIEVEMENTS = [
  { code: 'first_focus', icon: 'spark', title: '第一束光', description: '完成第一次有效专注' },
  { code: 'focus_10h', icon: 'clock', title: '渐入佳境', description: '累计专注 10 小时' },
  { code: 'focus_50h', icon: 'flame', title: '沉浸者', description: '累计专注 50 小时' },
  { code: 'task_10', icon: 'check', title: '行动派', description: '完成 10 个学习事项' },
  { code: 'task_50', icon: 'flag', title: '可靠的完成者', description: '完成 50 个学习事项' },
  { code: 'deep_10', icon: 'mountain', title: '深潜', description: '完成 10 次至少 60 分钟的专注' },
  { code: 'explorer', icon: 'compass', title: '多面探索者', description: '在至少 3 个领域留下专注记录' },
  { code: 'reflection_7', icon: 'book', title: '诚实的镜子', description: '完成 7 次日复盘' },
  { code: 'rhythm_7', icon: 'wave', title: '找到节奏', description: '最近 14 天中有 7 天保持学习' },
]

function focusXp(activeSeconds) {
  if (!Number.isFinite(activeSeconds) || activeSeconds < 60) return 0
  return Math.min(24, Math.floor(activeSeconds / 60 / 5))
}

function completionXp(totalTaskSeconds) {
  const minutes = Math.max(0, Math.floor((Number(totalTaskSeconds) || 0) / 60))
  return 20 + Math.floor(Math.min(minutes, 180) / 2)
}

function levelFromXp(totalXp) {
  let level = 1
  let remaining = Math.max(0, Math.floor(Number(totalXp) || 0))
  let required = 100
  while (remaining >= required) {
    remaining -= required
    level += 1
    required = 100 + 25 * (level - 1)
  }
  return {
    level,
    currentXp: remaining,
    nextLevelXp: required,
    progress: required ? remaining / required : 0,
  }
}

function secondsWithinRange(startedAt, endedAt, rangeStart, rangeEnd) {
  const start = Math.max(Number(startedAt), Number(rangeStart))
  const end = Math.min(Number(endedAt), Number(rangeEnd))
  return Math.max(0, Math.floor((end - start) / 1000))
}

function localDateKey(value = Date.now()) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dayBounds(dateKey = localDateKey()) {
  const start = new Date(`${dateKey}T00:00:00`).getTime()
  const end = new Date(`${dateKey}T00:00:00`).setDate(new Date(`${dateKey}T00:00:00`).getDate() + 1)
  return { start, end }
}

function weekStartKey(value = Date.now()) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return localDateKey(date.getTime())
}

function weekBounds(dateOrKey = Date.now()) {
  const value = typeof dateOrKey === 'string' ? new Date(`${dateOrKey}T12:00:00`).getTime() : dateOrKey
  const key = weekStartKey(value)
  const { start } = dayBounds(key)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end: end.getTime(), key }
}

module.exports = {
  ACHIEVEMENTS,
  focusXp,
  completionXp,
  levelFromXp,
  secondsWithinRange,
  localDateKey,
  dayBounds,
  weekStartKey,
  weekBounds,
}
