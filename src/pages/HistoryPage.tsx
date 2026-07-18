import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { useApp } from '../context/AppContext'
import { formatDate, formatDuration, friendlyError } from '../lib/format'
import type { FocusSession } from '../types'

function dateKey(value: number) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function HistoryPage() {
  const { notify } = useApp()
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [loading, setLoading] = useState(true)
  const [area, setArea] = useState('all')
  const { structure } = useApp()
  useEffect(() => {
    window.growthArc.history(160).then(setSessions).catch((error) => notify(friendlyError(error), 'error')).finally(() => setLoading(false))
  }, [notify])
  const filtered = area === 'all' ? sessions : sessions.filter((session) => session.area_id === area)
  const groups = useMemo(() => {
    const result = new Map<string, FocusSession[]>()
    for (const session of filtered) {
      const key = dateKey(session.ended_at || session.started_at)
      result.set(key, [...(result.get(key) || []), session])
    }
    return [...result.entries()]
  }, [filtered])
  const total = filtered.reduce((sum, session) => sum + Number(session.active_seconds), 0)

  return <div className="page history-page">
    <header className="page-heading"><div><span className="eyebrow">EVIDENCE</span><h1>你已经走过的路。</h1><p>这里不评判效率，只忠实保留每一次真实投入和当时留下的线索。</p></div><select className="filter-select" value={area} onChange={(event) => setArea(event.target.value)}><option value="all">全部领域</option>{structure?.areas.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></header>
    <section className="history-overview"><div><span>已记录专注</span><strong>{formatDuration(total)}</strong></div><div><span>专注次数</span><strong>{filtered.length}</strong></div><div><span>平均每次</span><strong>{formatDuration(filtered.length ? total / filtered.length : 0)}</strong></div></section>
    <div className="timeline panel">
      {loading ? <div className="loading-state">正在整理时间线…</div> : groups.length ? groups.map(([date, items]) => <section className="timeline-day" key={date}>
        <header><div><strong>{formatDate(date)}</strong><span>{items.length} 次 · {formatDuration(items.reduce((sum, item) => sum + Number(item.active_seconds), 0))}</span></div></header>
        <div>{items.map((session) => <article className="history-session" key={session.id}>
          <div className="timeline-mark" style={{ borderColor: session.area_color || '#8b9cff' }} />
          <time>{new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(session.started_at))}</time>
          <div className="history-copy"><div><strong>{session.content}</strong><span><i style={{ background: session.area_color }} />{session.area_name || '未分类'}</span></div>{session.outcome && <p><b>成果</b>{session.outcome}</p>}{session.blocker && <p className="history-blocker"><b>困难</b>{session.blocker}</p>}{session.next_step && <p><b>留下的路标</b>{session.next_step}</p>}</div>
          <strong className="history-duration">{formatDuration(session.active_seconds, true)}</strong>
        </article>)}</div>
      </section>) : <div className="empty-state tall"><Icon name="history" size={32} /><strong>时间线还没有内容</strong><span>完成第一次专注后，属于你的学习轨迹会从这里开始。</span></div>}
    </div>
  </div>
}
