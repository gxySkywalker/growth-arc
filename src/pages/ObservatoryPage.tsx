import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { formatDuration, friendlyError } from '../lib/format'
import { formatPeriodRange, formatDailyNavLabel, formatWeeklyNavLabel, getTrendText, mapReturnKindLabel, formatSessionCounts, getDominantTimeWindow, formatPixelDuration } from '../lib/observatory'

const DEV = (import.meta as any).env?.DEV
import { buildWeeklyObservationSummary, dailySummaryNote } from '../lib/observatoryInsights'
import { Icon } from '../components/Icon'
import { ObsChart } from '../components/ObsChart'
import { hourlyOption, weeklyBarsOption, heatmapOption } from '../lib/observatoryCharts'
import type { DailyObservatoryData, WeeklyObservatoryData } from '../types'

const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const ENERGY_LABELS = ['', '较低', '偏低', '平稳', '不错', '很好']

export function ObservatoryPage() {
  const { notify } = useApp()
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily')
  const [daily, setDaily] = useState<DailyObservatoryData | null>(null)
  const [weekly, setWeekly] = useState<WeeklyObservatoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState(Date.now())
  const [reviewWin, setReviewWin] = useState('')
  const [reviewEnergy, setReviewEnergy] = useState<number | null>(null)
  const [reviewBlocker, setReviewBlocker] = useState('')
  const [reviewFutureNote, setReviewFutureNote] = useState('')
  const [reviewExpanded, setReviewExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const reviewLoaded = useRef(false)
  const latestTs = useRef(cursor)

  const load = useCallback(async (ts: number) => {
    latestTs.current = ts
    setLoading(true)
    try {
      if (tab === 'daily') {
        const d = await window.growthArc.observatory.getDaily(ts)
        if (latestTs.current !== ts) return
        if (DEV) console.log('[obs] cursor', ts, '→ raw daily', d)
        setDaily(d)
        if (!reviewLoaded.current && d.review) {
          setReviewWin(d.review.win || '')
          setReviewEnergy(d.review.energy)
          setReviewBlocker(d.review.blocker || '')
          setReviewFutureNote(d.review.futureNote || '')
          reviewLoaded.current = true
        }
      } else {
        const w = await window.growthArc.observatory.getWeekly(ts)
        if (latestTs.current !== ts) return
        if (DEV) console.log('[obs] cursor', ts, '→ raw weekly', w)
        setWeekly(w)
        if (!reviewLoaded.current) {
          setReviewWin(''); setReviewEnergy(null); setReviewBlocker(''); setReviewFutureNote('')
          reviewLoaded.current = true
        }
      }
    } catch (e) { notify(friendlyError(e), 'error') }
    finally { setLoading(false) }
  }, [tab, notify])

  useEffect(() => { void load(cursor) }, [load, cursor])

  const nav = (n: number) => {
    if (saving) return
    setCursor(n)
    setSaved(false)
    reviewLoaded.current = false
  }
  const goToday = () => {
    const now = Date.now()
    setCursor(now)
    setSaved(false)
    reviewLoaded.current = false
  }

  const saveReview = async () => {
    setSaving(true)
    try {
      await window.growthArc.observatory.saveReview({
        date: daily?.period?.periodKey || '',
        win: reviewWin, blocker: reviewBlocker,
        energy: reviewEnergy, tomorrowTask: reviewFutureNote,
      })
      setSaved(true)
    } catch (e) { notify(friendlyError(e), 'error') }
    finally { setSaving(false) }
  }

  const hasReviewData = reviewWin.trim() || reviewBlocker.trim() || reviewFutureNote.trim() || reviewEnergy !== null
  const todayLocal = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
  const isToday = cursor ? (() => { const d = new Date(cursor); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })() === todayLocal : true
  const isCurrentWeek = (() => {
    const d = new Date(); d.setHours(0,0,0,0)
    const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    const monTs = d.getTime()
    const cur = new Date(cursor); cur.setHours(0,0,0,0)
    const curDay = cur.getDay(); cur.setDate(cur.getDate() - (curDay === 0 ? 6 : curDay - 1))
    return cur.getTime() === monTs
  })()

  // ── All hooks must stay above every early return ──────────
  const todayIdx = useMemo(() => new Date().getDay() === 0 ? 6 : new Date().getDay() - 1, [cursor])

  const dailyChartOption = useMemo(() => {
    if (!daily) { if (DEV) console.log('[obs] dailyChartOption: daily is null'); return null }
    const h: readonly number[] = daily.hourlyActiveSeconds ?? []
    const hasData = h.some((v: number) => v > 0)
    if (DEV) console.log('[obs] dailyChartOption', { hasData, sum: h.reduce((a,b)=>a+b,0), len: h.length, first: h.slice(0,4) })
    if (!hasData) return null
    return hourlyOption([...h])
  }, [daily])

  const weeklyBarsChartOption = useMemo(() => {
    if (!weekly) { if (DEV) console.log('[obs] weeklyBarsOption: weekly is null'); return null }
    const bars: readonly number[] = weekly.stats?.dailyActiveSeconds ?? []
    const hasData = bars.some((v: number) => v > 0)
    if (DEV) console.log('[obs] weeklyBarsOption', { hasData, bars })
    if (!hasData) return null
    return weeklyBarsOption([...bars], todayIdx)
  }, [weekly, todayIdx])

  const weeklyHeatChartOption = useMemo(() => {
    if (!weekly) { if (DEV) console.log('[obs] weeklyHeatOption: weekly is null'); return null }
    const grid: number[][] = weekly.hourlyActiveSecondsByDay ?? []
    const flat = grid.flat()
    const hasData = flat.some((v: number) => v > 0)
    if (DEV) console.log('[obs] weeklyHeatOption', { hasData, total: flat.reduce((a,b)=>a+b,0), rows: grid.length })
    if (!hasData) return null
    return heatmapOption(grid, todayIdx)
  }, [weekly, todayIdx])

  const dailyNote = useMemo(() => {
    if (!daily) return null
    return dailySummaryNote({ hourlyActiveSeconds: daily.hourlyActiveSeconds ?? [], directionBreakdown: daily.stats.directionBreakdown, totalActiveSeconds: daily.stats.totalActiveSeconds })
  }, [daily])

  const weeklyHeatData: number[][] = weekly?.hourlyActiveSecondsByDay ?? []

  if (loading) return <div className="page obs-page"><div className="loading-state">天文台正在校准星盘…</div></div>

  return <div className="page obs-page">
    <div className="obs-hero">
      <div className="obs-hero-window"><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="obs-hero-content">
        <div className="obs-hero-top">
          <div>
            <span className="obs-hero-label">OBSERVATORY · 天文台</span>
            {tab === 'daily' && daily && <h1>{formatPeriodRange(daily.period, 'daily')}</h1>}
            {tab === 'weekly' && weekly && <h1>{formatPeriodRange(weekly.period, 'weekly')}</h1>}
          </div>
          <div className="obs-hero-tabs">
            <button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')} aria-label="今日观测"><Icon name="sun" size={14} /> 今日观测</button>
            <button className={tab === 'weekly' ? 'active' : ''} onClick={() => setTab('weekly')} aria-label="本周星图"><Icon name="star" size={14} /> 本周星图</button>
          </div>
        </div>
        {tab === 'daily' && daily && (
          <div className="obs-hero-stats">
            <div>
              <span className="obs-hero-big">{formatPixelDuration(daily.stats.totalActiveSeconds).map((p, i) => p.isNumber ? <span key={i} className="pixel-num">{p.text}</span> : <span key={i}>{p.text}</span>)}</span>
              <span className="obs-hero-desc">今天留在星图上的时间</span>
            </div>
            <div className="obs-hero-detail">
              <span className="obs-hero-sub">
                {daily.stats.sessionCounts.deep > 0 && `深入远征 ${daily.stats.sessionCounts.deep} · `}
                {daily.stats.sessionCounts.expedition > 0 && `正式远征 ${daily.stats.sessionCounts.expedition} · `}
                {daily.stats.sessionCounts.short > 0 && `短程归来 ${daily.stats.sessionCounts.short} · `}
                {daily.stats.sessionCounts.brief > 0 && `短途折返 ${daily.stats.sessionCounts.brief} · `}
                路标 {daily.stats.completedTaskCount}
              </span>
              {daily.currentSession && (
                <span className="obs-hero-live"><Icon name="play" size={11} /> 炉火仍亮着 · 当前远征 {formatDuration(daily.currentSession.activeSeconds)}{daily.currentSession.status === 'paused' ? '（已暂停）' : ''}</span>
              )}
            </div>
          </div>
        )}
        {tab === 'weekly' && weekly && (
          <div className="obs-hero-stats">
            <div>
              <span className="obs-hero-big">{formatPixelDuration(weekly.stats.totalActiveSeconds).map((p, i) => p.isNumber ? <span key={i} className="pixel-num">{p.text}</span> : <span key={i}>{p.text}</span>)}</span>
              <span className="obs-hero-desc">这一周留下的星轨</span>
            </div>
            <div className="obs-hero-detail">
              <span className="obs-hero-sub">
                {weekly.stats.sessionCounts.deep > 0 && `深入远征 ${weekly.stats.sessionCounts.deep} · `}
                {weekly.stats.sessionCounts.expedition > 0 && `正式远征 ${weekly.stats.sessionCounts.expedition} · `}
                {weekly.stats.sessionCounts.short > 0 && `短程归来 ${weekly.stats.sessionCounts.short} · `}
                {weekly.stats.sessionCounts.brief > 0 && `短途折返 ${weekly.stats.sessionCounts.brief} · `}
                路标 {weekly.stats.completedTaskCount}
              </span>
              <span className="obs-hero-trend"><Icon name="wave" size={12} /> {getTrendText(weekly.stats.totalActiveSeconds, weekly.stats.previousPeriodTotalSeconds)}</span>
            </div>
          </div>
        )}
      </div>
    </div>

    <div className="obs-nav">
      <button className="obs-nav-btn" onClick={() => nav(tab === 'daily' ? cursor - 86400000 : cursor - 7 * 86400000)} aria-label="上一个">‹</button>
      <span className="obs-nav-label">
        {tab === 'daily' && daily ? formatDailyNavLabel(daily.period) : ''}
        {tab === 'weekly' && weekly ? formatWeeklyNavLabel(weekly.period) : ''}
      </span>
      <button className="obs-nav-btn" onClick={() => { const n = tab === 'daily' ? cursor + 86400000 : cursor + 7 * 86400000; if (n <= Date.now()) nav(n) }} disabled={tab === 'daily' ? cursor + 86400000 > Date.now() : cursor + 7 * 86400000 > Date.now()} aria-label="下一个">›</button>
      {!isToday && tab === 'daily' ? <button className="obs-nav-today" onClick={goToday}>回到今天</button> : null}
      {!isCurrentWeek && tab === 'weekly' ? <button className="obs-nav-today" onClick={goToday}>回到本周</button> : null}
    </div>

    {tab === 'daily' && daily && <>
      <section className="panel obs-panel-wood">
        <h2 className="obs-panel-title">二十四时观测</h2>
        <div key={cursor} style={{ height: 160, background: '#283342' }}>
          <ObsChart option={dailyChartOption} empty={!dailyChartOption} emptyText="这一天还没有时间记录。" />
        </div>
        {dailyNote ? <div className="obs-insight-note">{dailyNote}</div> : null}
      </section>

      <div className="obs-grid-2 obs-grid-uneven">
        <section className="panel obs-panel-wood">
          <h2 className="obs-panel-title">今日足迹</h2>
          {daily.sessions.length > 0 ? (
            <div className="obs-timeline">
              {daily.sessions.map(s => (
                <div key={s.id} className="obs-timeline-item">
                  <span className="obs-tl-time">{new Date(s.endedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="obs-tl-title" title={s.title || '临时远征'}>{s.title || '临时远征'}</span>
                  <span className="obs-tl-duration">{formatDuration(s.activeSeconds)}</span>
                  <span className={`obs-tl-kind obs-kind-${s.returnKind}`}>{mapReturnKindLabel(s.returnKind)}</span>
                </div>
              ))}
            </div>
          ) : <div className="obs-empty">星图上暂时没有今天的落点。</div>}
        </section>
        <section className="panel obs-panel-paper">
          <h2 className="obs-panel-title">旅途方向</h2>
          {daily.stats.directionBreakdown.length > 0 ? (
            <div className="obs-direction-list">
              {daily.stats.directionBreakdown.map(d => {
                const pct = daily.stats.totalActiveSeconds > 0 ? Math.round(d.seconds / daily.stats.totalActiveSeconds * 100) : 0
                return <div key={d.id} className="obs-direction-row">
                  <span className="obs-dir-name"><i style={{ background: d.color || '#8b7355' }} />{d.name || '未分类'}</span>
                  <span className="obs-dir-track"><span className="obs-dir-fill" style={{ width: `${Math.max(2, pct)}%` }} /></span>
                  <span className="obs-dir-time">{formatDuration(d.seconds)}</span>
                </div>
              })}
            </div>
          ) : <div className="obs-empty">暂无方向记录。</div>}
        </section>
      </div>
      <section className="panel obs-panel-paper">
        <h2 className="obs-panel-title">观测册</h2>
        <div className="obs-review-form">
          <label>今天最想留下的一件事<textarea rows={2} value={reviewWin} onChange={e => { setReviewWin(e.target.value); setSaved(false) }} placeholder="不必宏大，写下真正向前的一点" /></label>
          <div className="obs-review-row">
            <div className="obs-energy-group"><span className="obs-energy-label">今天的整体状态</span>
              <div className="obs-energy-dots">{[1,2,3,4,5].map(v => (
                <button key={v} className={reviewEnergy === v ? 'active' : ''} onClick={() => setReviewEnergy(v === reviewEnergy ? null : v)} aria-label={ENERGY_LABELS[v]}>{ENERGY_LABELS[v]}</button>
              ))}</div>
            </div>
            <div className="obs-review-actions">
              {saved && <span className="obs-saved-mark">已写入今日星页</span>}
              <button className="button button-ghost button-small" disabled={saving || !hasReviewData} onClick={saveReview}>{saving ? '正在收进观测册…' : saved ? '已写入今日星页' : '收进观测册'}</button>
            </div>
          </div>
          {reviewExpanded && <div className="obs-review-extra">
            <label>今天遇到的阻碍<textarea rows={2} value={reviewBlocker} onChange={e => setReviewBlocker(e.target.value)} placeholder="记录事实，不责备自己" /></label>
            <label>给未来自己的话<textarea rows={2} value={reviewFutureNote} onChange={e => setReviewFutureNote(e.target.value)} placeholder="没有想说的也可以留空" /></label>
          </div>}
          <button className="text-button" onClick={() => setReviewExpanded(v => !v)}>{reviewExpanded ? '合上这一页' : '翻开下一页'}</button>
        </div>
      </section>
      <div className="obs-herald"><span className="obs-herald-icon">✦</span><span>小天使会在夜深后整理今天的星页</span></div>
    </>}

    {tab === 'weekly' && weekly && <>
      {(() => {
        const obs = buildWeeklyObservationSummary(weekly)
        return (obs.headline || obs.details.length > 0) ? (
          <section className="obs-starlog">
            <h2 className="obs-starlog-title">✦ 星象札记</h2>
            {obs.headline && <p className="obs-starlog-headline">{obs.headline}</p>}
            {obs.details.map((l, i) => <p key={i} className="obs-starlog-line">{l}</p>)}
          </section>
        ) : null
      })()}
      {(() => {
        const dom = getDominantTimeWindow(weeklyHeatData.flat())
        return (
          <section className="panel obs-panel-wood">
            <h2 className="obs-panel-title">本周星轨</h2>
            <div key={`h-${cursor}`} style={{ height: 220, background: '#283342' }}>
              <ObsChart option={weeklyHeatChartOption} empty={!weeklyHeatChartOption} emptyText="本周还没有形成可观察的时段分布。" />
            </div>
            {weeklyHeatChartOption && dom && <div className="obs-heat-desc" style={{ marginTop: 4 }}>本周的足迹较多出现在{dom.label}。</div>}
          </section>
        )
      })()}
      {(() => {
        return (
          <section className="panel obs-panel-wood">
            <h2 className="obs-panel-title">七日星柱</h2>
            <div key={`w-${cursor}`} style={{ height: 160, background: '#283342' }}>
              <ObsChart option={weeklyBarsChartOption} empty={!weeklyBarsChartOption} emptyText="本周星图上还没有新的落点。" />
            </div>
          </section>
        )
      })()}
      <div className="obs-grid-2">
        <section className="panel obs-panel-paper">
          <h2 className="obs-panel-title">旅途方向</h2>
          {weekly.stats.directionBreakdown.length > 0 ? (
            <div className="obs-direction-list">{weekly.stats.directionBreakdown.map(d => {
              const pct = weekly.stats.totalActiveSeconds > 0 ? Math.round(d.seconds / weekly.stats.totalActiveSeconds * 100) : 0
              return <div key={d.id} className="obs-direction-row">
                <span className="obs-dir-name"><i style={{ background: d.color || '#8b7355' }} />{d.name || '未分类'}</span>
                <span className="obs-dir-track"><span className="obs-dir-fill" style={{ width: `${Math.max(2, pct)}%` }} /></span>
                <span className="obs-dir-time">{formatDuration(d.seconds)}</span>
              </div>
            })}</div>
          ) : <div className="obs-empty">暂无方向记录。</div>}
        </section>
        <section className="panel obs-panel-paper">
          <h2 className="obs-panel-title">本周足迹</h2>
          <div className="obs-weekly-stats">
            <div className="obs-ws-row"><span>出征</span><span>{weekly.stats.sessionCounts.deep > 0 && `深入 ${weekly.stats.sessionCounts.deep} · `}{weekly.stats.sessionCounts.expedition > 0 && `正式 ${weekly.stats.sessionCounts.expedition} · `}{weekly.stats.sessionCounts.short > 0 && `短程 ${weekly.stats.sessionCounts.short} · `}{weekly.stats.sessionCounts.brief > 0 && `短途 ${weekly.stats.sessionCounts.brief}`}</span></div>
            <div className="obs-ws-row"><span>路标</span><span>{weekly.stats.completedTaskCount}</span></div>
            <div className="obs-ws-row"><span>最长远征</span><span>{formatDuration(weekly.stats.longestSessionSeconds)}</span></div>
            {weekly.representativeTasks.length > 0 && <div className="obs-task-list">{weekly.representativeTasks.map(t => <div key={t.id} className="obs-task-item"><Icon name="check" size={13} /> {t.title}</div>)}</div>}
          </div>
        </section>
      </div>
      <div className="obs-herald"><span className="obs-herald-icon">✦</span><span>周信会在本周结束后送达</span></div>
    </>}
  </div>
}
