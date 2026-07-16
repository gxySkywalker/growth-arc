import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { friendlyError, formatClock } from '../lib/format'
import { Icon } from './Icon'
import { Modal } from './Modal'
import { PixelCompanion } from './PixelCompanion'
import type { ExpeditionResult } from '../types'

const DURATION_OPTIONS = [15, 25, 45, 60, 90]

export function FocusController() {
  const { activeSession, setActiveSession, structure, dashboard, refresh, notify } = useApp()
  const [startOpen, setStartOpen] = useState(false)
  const [stopOpen, setStopOpen] = useState(false)
  const [expedition, setExpedition] = useState<ExpeditionResult | null>(null)
  const [taskId, setTaskId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [content, setContent] = useState('')
  const [companionId, setCompanionId] = useState('')
  const [plannedMinutes, setPlannedMinutes] = useState(25)
  const [outcome, setOutcome] = useState('')
  const [blocker, setBlocker] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [taskCompleted, setTaskCompleted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(Date.now())
  const snapshotAt = useRef(Date.now())
  const companions = dashboard?.world.companions.owned || []

  useEffect(() => {
    snapshotAt.current = Date.now()
    const timer = window.setInterval(() => setTick(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [activeSession?.id, activeSession?.status])

  useEffect(() => {
    if (!activeSession || activeSession.status !== 'running') return
    const heartbeat = window.setInterval(async () => {
      try {
        const session = await window.growthArc.session.heartbeat(activeSession.id)
        snapshotAt.current = Date.now()
        setActiveSession(session)
      } catch { /* refresh will surface persistent errors */ }
    }, 30000)
    return () => window.clearInterval(heartbeat)
  }, [activeSession?.id, activeSession?.status, setActiveSession])

  const elapsed = useMemo(() => {
    if (!activeSession) return 0
    if (activeSession.status !== 'running') return Number(activeSession.active_seconds)
    return Number(activeSession.active_seconds) + Math.max(0, Math.floor((tick - snapshotAt.current) / 1000))
  }, [activeSession, tick])

  const activeCompanion = useMemo(() => {
    if (!dashboard) return null
    return dashboard.world.companions.owned.find((item) => item.id === activeSession?.companion_id)
      || dashboard.world.companions.active
  }, [activeSession?.companion_id, dashboard])

  const resetStart = () => {
    setTaskId('')
    setAreaId(structure?.areas[0]?.id || '')
    setContent('')
    setCompanionId(dashboard?.world.companions.active?.id || '')
    setPlannedMinutes(25)
  }

  const openStart = (presetTaskId?: string) => {
    resetStart()
    if (presetTaskId) {
      const task = structure?.tasks.find((item) => item.id === presetTaskId)
      setTaskId(presetTaskId)
      if (task) setAreaId(task.area_id)
    }
    setStartOpen(true)
  }

  useEffect(() => {
    const listener = (event: Event) => openStart((event as CustomEvent<string>).detail)
    window.addEventListener('growtharc:start-focus', listener)
    return () => window.removeEventListener('growtharc:start-focus', listener)
  })

  const start = async () => {
    setBusy(true)
    try {
      const session = await window.growthArc.session.start({
        taskId: taskId || null,
        areaId: areaId || null,
        content,
        companionId: companionId || null,
        plannedMinutes,
      })
      snapshotAt.current = Date.now()
      setActiveSession(session)
      setStartOpen(false)
      notify('城门已经打开。接下来只需要专注赶路。', 'success')
      await refresh()
    } catch (error) { notify(friendlyError(error), 'error') }
    finally { setBusy(false) }
  }

  const togglePause = async () => {
    if (!activeSession) return
    try {
      const next = activeSession.status === 'running'
        ? await window.growthArc.session.pause(activeSession.id)
        : await window.growthArc.session.resume(activeSession.id)
      snapshotAt.current = Date.now()
      setActiveSession(next)
    } catch (error) { notify(friendlyError(error), 'error') }
  }

  const stop = async () => {
    if (!activeSession) return
    setBusy(true)
    try {
      const result = await window.growthArc.session.stop(activeSession.id, { outcome, blocker, nextStep, taskCompleted })
      setActiveSession(null)
      setStopOpen(false)
      setExpedition(result.expedition)
      setOutcome(''); setBlocker(''); setNextStep(''); setTaskCompleted(false)
      await refresh()
    } catch (error) { notify(friendlyError(error), 'error') }
    finally { setBusy(false) }
  }

  const cancel = async () => {
    if (!activeSession || !window.confirm('要提前返回营地吗？这次不会结算宝藏。')) return
    try {
      await window.growthArc.session.cancel(activeSession.id)
      setActiveSession(null)
      setStopOpen(false)
      await refresh()
    } catch (error) { notify(friendlyError(error), 'error') }
  }

  const plannedSeconds = Number(activeSession?.planned_seconds || 1500)
  const progress = Math.min(100, elapsed / Math.max(1, plannedSeconds) * 100)
  const destinationReached = elapsed >= plannedSeconds

  return <>
    {activeSession ? <section className={`focus-expedition ${activeSession.status === 'paused' ? 'is-paused' : ''}`}>
      <div className="focus-sky"><i /><i /><i /></div>
      <div className="focus-mountains mountain-back" />
      <div className="focus-mountains mountain-front" />
      <div className="focus-path" />
      <header className="focus-topbar">
        <div><span className="focus-live-dot" />{activeSession.status === 'paused' ? '队伍正在路边休息' : '远征途中 · 请勿打扰'}</div>
        <button className="quiet-exit" onClick={() => setStopOpen(true)}>准备返航</button>
      </header>
      <div className="focus-journey">
        <div className="focus-companion"><PixelCompanion companion={activeCompanion} /><span className="walking-dust">···</span></div>
        <div className="focus-copy">
          <span>{activeSession.area_name || '今日远征'}</span>
          <h1>{activeSession.content}</h1>
          <p>{destinationReached ? '已经抵达计划中的目的地。可以从容收尾，也可以再探索一会儿。' : `${activeCompanion?.nickname || '伙伴'}正安静陪你赶路。`}</p>
          <time>{formatClock(elapsed)}</time>
          <div className="journey-progress"><i style={{ width: `${Math.max(2, progress)}%` }} /><b style={{ left: `${Math.min(97, progress)}%` }}>◆</b></div>
          <div className="journey-labels"><span>营地</span><span>{destinationReached ? '已抵达' : `计划 ${Math.round(plannedSeconds / 60)} 分钟`}</span></div>
          <div className="focus-controls">
            <button className="button button-soft" onClick={togglePause}><Icon name={activeSession.status === 'running' ? 'pause' : 'play'} />{activeSession.status === 'running' ? '路边休息' : '继续赶路'}</button>
            <button className="button button-primary" onClick={() => setStopOpen(true)}><Icon name="flag" />完成并返航</button>
          </div>
        </div>
      </div>
      <footer className="focus-whisper">随机事件正在旅途中安静发生，返航时再一起翻开日志。</footer>
    </section> : <button className="floating-focus" onClick={() => openStart()}><Icon name="play" size={18} />开始远征</button>}

    {startOpen && <Modal title="准备下一次远征" onClose={() => setStartOpen(false)} size="wide">
      <div className="modal-body expedition-setup">
        <div className="setup-main form-stack">
          <label>从地图选择任务（可选）<select value={taskId} onChange={(event) => {
            setTaskId(event.target.value)
            const task = structure?.tasks.find((item) => item.id === event.target.value)
            if (task) setAreaId(task.area_id)
          }}><option value="">临时远征</option>{structure?.tasks.filter((task) => task.status !== 'done').map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
          {!taskId && <><label>探索区域<select value={areaId} onChange={(event) => setAreaId(event.target.value)}>{structure?.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
          <label>这次只推进什么？<input autoFocus value={content} onChange={(event) => setContent(event.target.value)} placeholder="例如：读完第三章并整理两个例题" /></label></>}
          <fieldset><legend>计划走多远</legend><div className="duration-picks">{DURATION_OPTIONS.map((minutes) => <button type="button" className={plannedMinutes === minutes ? 'selected' : ''} key={minutes} onClick={() => setPlannedMinutes(minutes)}><strong>{minutes}</strong><span>分钟</span></button>)}</div><small>时长越长，稀有发现概率越高；90分钟后不再增加。</small></fieldset>
        </div>
        <aside className="companion-pick"><span>同行伙伴</span><PixelCompanion companion={companions.find((item) => item.id === companionId) || dashboard?.world.companions.active || null} size="medium" /><select value={companionId} onChange={(event) => setCompanionId(event.target.value)}>{companions.map((item) => <option key={item.id} value={item.id}>{item.nickname} · {item.stageName}</option>)}</select><p>本次远征会增加羁绊，并留下属于你们的共同记录。</p></aside>
      </div>
      <footer className="modal-footer"><button className="button button-ghost" onClick={() => setStartOpen(false)}>再准备一下</button><button className="button button-primary" disabled={busy || (!taskId && (!content.trim() || !areaId))} onClick={start}><Icon name="play" />穿过城门</button></footer>
    </Modal>}

    {stopOpen && activeSession && <Modal title="整理这次带回的东西" onClose={() => setStopOpen(false)} size="wide">
      <div className="session-summary-strip"><div><span>远征目标</span><strong>{activeSession.content}</strong></div><div><span>有效专注</span><strong>{formatClock(elapsed)}</strong></div></div>
      <div className="modal-body form-stack two-column-form">
        <label className="span-2">这次真正带回了什么？<textarea autoFocus rows={3} value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="写下一句成果或新理解，它会成为知识遗物" /></label>
        <label>仍然困惑的地方（可选）<textarea rows={2} value={blocker} onChange={(event) => setBlocker(event.target.value)} placeholder="下次可以继续探索" /></label>
        <label>下一次从哪里出发（可选）<textarea rows={2} value={nextStep} onChange={(event) => setNextStep(event.target.value)} placeholder="给未来的自己留一条路标" /></label>
        {activeSession.task_id && <label className="check-row span-2"><input type="checkbox" checked={taskCompleted} onChange={(event) => setTaskCompleted(event.target.checked)} /><span><strong>地图上的这项任务已经完成</strong><small>确认后会归档，并结算对应经验。</small></span></label>}
      </div>
      <footer className="modal-footer split-footer"><button className="button button-danger-ghost" onClick={cancel}>空手提前返回</button><div><button className="button button-ghost" onClick={() => setStopOpen(false)}>再走一会儿</button><button className="button button-primary" disabled={busy} onClick={stop}><Icon name="home" />回到小屋</button></div></footer>
    </Modal>}

    {expedition && <Modal title="远征归来" onClose={() => setExpedition(null)} size="wide">
      <div className="return-scene">
        <span className="return-tier">{expedition.tier.name}</span>
        <h2>{expedition.location}</h2>
        <p>{expedition.event}</p>
        <div className="chest"><i /><b>✦</b></div>
      </div>
      <div className="modal-body reward-body">
        <header><div><small>本次收获</small><h3>{expedition.rareFound ? '宝箱里闪着少见的光' : '行囊装得满满当当'}</h3></div><span>羁绊 +{expedition.bondXp}</span></header>
        <div className="reward-grid">{expedition.drops.map((drop) => <article className={drop.item.rarity} key={drop.item.id}><span>{drop.item.rarity === 'rare' ? '✦' : '◆'}</span><div><small>{drop.item.rarity === 'rare' ? '稀有宝藏' : '常规掉落'}</small><strong>{drop.item.name}</strong><p>{drop.item.description}</p></div><b>×{drop.quantity}</b></article>)}</div>
        {expedition.newCompanion && <div className="new-friend"><PixelCompanion companion={expedition.newCompanion} size="medium" /><div><small>旅途中传来了新的脚步声</small><h3>遇见了 {expedition.newCompanion.species.name}</h3><p>{expedition.newCompanion.species.description}</p></div></div>}
        {expedition.knowledgeRelic && <div className="relic-return"><span>▤</span><div><small>知识遗物已经归档</small><strong>{expedition.knowledgeRelic.title}</strong><p>{expedition.knowledgeRelic.content}</p></div></div>}
      </div>
      <footer className="modal-footer"><button className="button button-primary" onClick={() => setExpedition(null)}>把宝藏放回小屋</button></footer>
    </Modal>}
  </>
}

export function startFocus(taskId?: string) {
  window.dispatchEvent(new CustomEvent('growtharc:start-focus', { detail: taskId || '' }))
}
