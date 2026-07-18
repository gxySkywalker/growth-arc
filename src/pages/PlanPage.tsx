import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { startFocus } from '../components/FocusController'
import { useApp } from '../context/AppContext'
import { friendlyError } from '../lib/format'

type FormType = 'area' | 'goal' | 'task' | null
const COLORS = ['#a55c36', '#6f8255', '#c3964a', '#6c7c83', '#93685a', '#7a6a8d']

export function PlanPage() {
  const { structure, refresh, notify } = useApp()
  const [selectedArea, setSelectedArea] = useState('')
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [form, setForm] = useState<FormType>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [busy, setBusy] = useState(false)
  if (!structure) return null
  const areaId = selectedArea || structure.areas[0]?.id || ''
  const goals = structure.goals.filter((goal) => goal.area_id === areaId)
  const tasks = structure.tasks.filter((task) => task.area_id === areaId && (!selectedGoal || task.goal_id === selectedGoal))
  const area = structure.areas.find((item) => item.id === areaId)
  const counts = useMemo(() => Object.fromEntries(structure.areas.map((item) => [item.id, structure.tasks.filter((task) => task.area_id === item.id && task.status !== 'done').length])), [structure])

  const openForm = (type: FormType) => { setName(''); setDescription(''); setDueDate(''); setForm(type) }
  const submit = async () => {
    setBusy(true)
    try {
      if (form === 'area') await window.growthArc.structure.createArea({ name, color })
      if (form === 'goal') await window.growthArc.structure.createGoal({ areaId, title: name, description, dueDate: dueDate || null })
      if (form === 'task') await window.growthArc.structure.createTask({ areaId, goalId: selectedGoal, title: name, notes: description })
      setForm(null); notify('地图上多了一个新记号', 'success'); await refresh()
    } catch (error) { notify(friendlyError(error), 'error') }
    finally { setBusy(false) }
  }

  const updateTask = async (id: string, status: 'done' | 'archived') => {
    try { await window.growthArc.structure.updateTask(id, { status }); await refresh() }
    catch (error) { notify(friendlyError(error), 'error') }
  }

  return <div className="page plan-page">
    <header className="page-heading plan-heading"><div><span className="eyebrow">王国制图室 · 地图桌</span><h1>想去哪里，就在地图上做个记号。</h1><p>地图只替你保存方向。什么时候出发、走多远，都由此刻的你决定。</p></div><button className="button button-primary" onClick={() => openForm('task')}><Icon name="plus" size={17} />放置远征记号</button></header>
    <div className="planner-layout">
      <aside className="planner-sidebar panel">
        <div className="section-heading"><div><span className="eyebrow">地图图层</span><h2>探索领域</h2></div><button className="icon-button" onClick={() => openForm('area')} title="绘制新区域"><Icon name="plus" size={18} /></button></div>
        <div className="area-nav">{structure.areas.map((item) => <button key={item.id} className={item.id === areaId ? 'active' : ''} onClick={() => { setSelectedArea(item.id); setSelectedGoal(null) }}><i style={{ background: item.color }} /><span>{item.name}</span><b>{counts[item.id] || 0}</b></button>)}</div>
      </aside>
      <main className="planner-main panel">
        <span className="map-compass" aria-hidden="true">✦</span>
        <div className="planner-title"><div><span className="color-dot large" style={{ background: area?.color }} /><div><span className="eyebrow">正在查看</span><h2>{area?.name || '未命名区域'}</h2><p>{goals.length} 枚路标 · {tasks.length} 个远征记号</p></div></div><button className="button button-secondary button-small" onClick={() => openForm('goal')}><Icon name="flag" size={16} />设置路标</button></div>
        <div className="goal-tabs" aria-label="地图路标"><button className={!selectedGoal ? 'active' : ''} onClick={() => setSelectedGoal(null)}>全部记号</button>{goals.map((goal) => <button key={goal.id} className={selectedGoal === goal.id ? 'active' : ''} onClick={() => setSelectedGoal(goal.id)}>{goal.title}<span>{structure.tasks.filter((task) => task.goal_id === goal.id && task.status !== 'done').length}</span></button>)}</div>
        {selectedGoal && <div className="goal-context"><Icon name="flag" /><div><strong>{goals.find((goal) => goal.id === selectedGoal)?.title}</strong><span>{goals.find((goal) => goal.id === selectedGoal)?.description || '没有额外说明'}</span></div></div>}
        <div className="planner-task-list">
          {tasks.length ? tasks.map((task) => <article key={task.id} className={`planner-task ${task.status === 'done' ? 'is-done' : ''}`}>
            <button className="round-check" onClick={() => void updateTask(task.id, task.status === 'done' ? 'archived' : 'done')}><Icon name="check" size={15} /></button>
            <div><strong>{task.title}</strong>{task.notes && <p>{task.notes}</p>}<span>{task.status === 'doing' ? '进行中' : task.status === 'done' ? '已完成' : '待开始'}{task.goal_id && ` · ${structure.goals.find((goal) => goal.id === task.goal_id)?.title || ''}`}</span></div>
            {task.status !== 'done' && <button className="task-play" onClick={() => startFocus(task.id)}><Icon name="play" size={16} />开始</button>}
          </article>) : <div className="empty-state map-empty"><Icon name="plan" size={30} /><strong>这片地图还是空白的</strong><span>等某件事值得出发时，再在这里放下一枚记号。</span><button className="button button-secondary" onClick={() => openForm('task')}><Icon name="plus" size={16} />放置记号</button></div>}
        </div>
      </main>
    </div>

    {form && <Modal title={form === 'area' ? '绘制新的探索区域' : form === 'goal' ? `在「${area?.name}」设置路标` : '放置一个远征记号'} onClose={() => setForm(null)}>
      <div className="modal-body form-stack">
        <label>{form === 'area' ? '领域名称' : form === 'goal' ? '目标名称' : '事项名称'}<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder={form === 'area' ? '例如：编程' : form === 'goal' ? '例如：完成 React 基础课程' : '例如：学习状态管理章节'} /></label>
        {form !== 'area' && <label>{form === 'goal' ? '为什么要完成它？' : '补充说明（可选）'}<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>}
        {form === 'goal' && <label>截止日期（可选）<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>}
        {form === 'area' && <fieldset className="color-picker"><legend>识别颜色</legend>{COLORS.map((item) => <button key={item} className={color === item ? 'active' : ''} style={{ background: item }} onClick={() => setColor(item)} aria-label={item} />)}</fieldset>}
        {form === 'task' && <label>关联目标（可选）<select value={selectedGoal || ''} onChange={(event) => setSelectedGoal(event.target.value || null)}><option value="">不关联目标</option>{goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</select></label>}
      </div>
      <footer className="modal-footer"><button className="button button-ghost" onClick={() => setForm(null)}>先不放置</button><button className="button button-primary" disabled={busy || !name.trim()} onClick={submit}>收进地图</button></footer>
    </Modal>}
  </div>
}
