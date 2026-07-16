import { useEffect, useState } from 'react'
import { AiReportCard } from '../components/AiReportCard'
import { Icon } from '../components/Icon'
import { useApp } from '../context/AppContext'
import { formatDuration, friendlyError, todayKey } from '../lib/format'
import type { DailyReviewData, WeeklyReportData } from '../types'

export function ReviewPage() {
  const { notify, refresh } = useApp()
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily')
  const [date, setDate] = useState(todayKey())
  const [daily, setDaily] = useState<DailyReviewData | null>(null)
  const [weekly, setWeekly] = useState<WeeklyReportData | null>(null)
  const [win, setWin] = useState('')
  const [blocker, setBlocker] = useState('')
  const [energy, setEnergy] = useState<number | null>(null)
  const [tomorrowTask, setTomorrowTask] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      if (tab === 'daily') {
        const data = await window.growthArc.review.daily(date)
        setDaily(data); setWin(data.review?.win || ''); setBlocker(data.review?.blocker || ''); setEnergy(data.review?.energy || null); setTomorrowTask(data.review?.tomorrow_task || '')
      } else setWeekly(await window.growthArc.review.weekly(date))
    } catch (error) { notify(friendlyError(error), 'error') }
  }
  useEffect(() => { void load() }, [tab, date]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveDaily = async () => {
    setBusy(true)
    try {
      await window.growthArc.review.saveDaily({ date, win, blocker, energy, tomorrowTask })
      notify('今天已经好好收尾。', 'success'); await load(); await refresh()
    } catch (error) { notify(friendlyError(error), 'error') }
    finally { setBusy(false) }
  }
  const generateAi = async () => {
    setBusy(true)
    try { await window.growthArc.ai.generate(tab, date); notify('AI 报告已生成', 'success'); await load() }
    catch (error) { notify(friendlyError(error), 'error') }
    finally { setBusy(false) }
  }

  const stats = tab === 'daily' ? daily?.stats : weekly?.stats
  return <div className="page review-page">
    <header className="page-heading"><div><span className="eyebrow">REFLECTION</span><h1>让经历变成反馈。</h1><p>复盘不是审判过去，而是给下一次开始留一条更清晰的路。</p></div><input className="date-control" type="date" value={date} max={todayKey()} onChange={(event) => setDate(event.target.value)} /></header>
    <div className="segmented"><button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>日复盘</button><button className={tab === 'weekly' ? 'active' : ''} onClick={() => setTab('weekly')}>周成长报告</button></div>
    {stats && <section className="review-stats"><div><Icon name="clock" /><span>专注投入<strong>{formatDuration(stats.focusSeconds)}</strong></span></div><div><Icon name="check" /><span>完成事项<strong>{stats.completedTasks}</strong></span></div><div><Icon name="wave" /><span>{tab === 'daily' ? '专注次数' : '活跃天数'}<strong>{tab === 'daily' ? stats.sessionCount : stats.activeDays}</strong></span></div><div><Icon name="growth" /><span>平均专注<strong>{formatDuration(stats.averageSessionSeconds)}</strong></span></div></section>}

    {tab === 'daily' && daily && <div className="review-layout">
      <section className="panel review-form"><div className="section-heading"><div><span className="eyebrow">ONE MINUTE</span><h2>今天留下什么？</h2></div></div>
        <div className="form-stack"><label>今天最重要的成果<textarea rows={3} value={win} onChange={(event) => setWin(event.target.value)} placeholder="不必宏大，写下真正向前的一点" /></label><label>最大的阻碍（可选）<textarea rows={2} value={blocker} onChange={(event) => setBlocker(event.target.value)} placeholder="记录事实，不责备自己" /></label>
          <fieldset className="energy-picker"><legend>学习时的整体状态</legend>{[1,2,3,4,5].map((value) => <button key={value} className={energy === value ? 'active' : ''} onClick={() => setEnergy(value)}><span>{['低','偏低','平稳','不错','很好'][value - 1]}</span><i>{value}</i></button>)}</fieldset>
          <label>明天打开系统后的第一件事<input value={tomorrowTask} onChange={(event) => setTomorrowTask(event.target.value)} placeholder="让明天的开始无需重新思考" /></label>
        </div><footer className="form-footer"><button className="button button-primary" disabled={busy} onClick={saveDaily}><Icon name="check" size={17} />保存今日复盘</button></footer>
      </section>
      <aside className="review-side">{daily.review?.ai ? <AiReportCard report={daily.review.ai} model={daily.review.ai_model} /> : <section className="panel ai-empty"><div className="ai-mark"><Icon name="brain" /></div><h2>需要另一双眼睛吗？</h2><p>AI 会读取当天统计、事项名称和你的复盘文字，生成一份温和但诚实的观察。</p><button className="button button-secondary" disabled={busy} onClick={generateAi}>{busy ? '正在思考…' : '生成 AI 日评'}</button><small>数据会发送到你配置的 OpenAI API。</small></section>}</aside>
    </div>}

    {tab === 'weekly' && weekly && <div className="weekly-stack">
      <section className="panel weekly-overview"><div className="section-heading"><div><span className="eyebrow">WEEK OF {weekly.weekStart}</span><h2>这一周的真实形状</h2></div><button className="button button-secondary" disabled={busy} onClick={generateAi}><Icon name="brain" size={17} />{weekly.ai ? '重新生成' : '生成 AI 周报'}</button></div>
        <div className="comparison-grid"><div><span>专注时间</span><strong>{formatDuration(weekly.stats.focusSeconds)}</strong><Trend current={weekly.stats.focusSeconds} previous={weekly.previousStats.focusSeconds} /></div><div><span>完成事项</span><strong>{weekly.stats.completedTasks}</strong><Trend current={weekly.stats.completedTasks} previous={weekly.previousStats.completedTasks} /></div><div><span>活跃天数</span><strong>{weekly.stats.activeDays}</strong><Trend current={weekly.stats.activeDays} previous={weekly.previousStats.activeDays} /></div></div>
        <div className="weekly-columns"><section><h3>本周完成</h3>{weekly.completedTasks.length ? <ul className="clean-list">{weekly.completedTasks.map((task, index) => <li key={index}><Icon name="check" size={15} />{task.title}</li>)}</ul> : <p className="muted">没有标记完成的事项。</p>}</section><section><h3>领域投入</h3>{weekly.stats.byArea.map((area) => <div className="mini-area" key={area.id}><span><i style={{ background: area.color }} />{area.name}</span><b>{formatDuration(area.seconds, true)}</b></div>)}</section></div>
      </section>
      {weekly.ai && <AiReportCard report={weekly.ai} model={weekly.aiModel} />}
    </div>}
  </div>
}

function Trend({ current, previous }: { current: number; previous: number }) {
  if (!previous) return <small>从这里开始积累</small>
  const percent = Math.round((current - previous) / previous * 100)
  return <small className={percent > 0 ? 'trend-up' : percent < 0 ? 'trend-down' : ''}>{percent > 0 ? '↑' : percent < 0 ? '↓' : '—'} 较上周 {Math.abs(percent)}%</small>
}
