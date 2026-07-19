import { useRef, useState } from 'react'
import type { PageId } from '../types'
import type { LootItem } from '../types'
import { useApp } from '../context/AppContext'
import { formatDate, formatDuration, friendlyError } from '../lib/format'
import { Icon } from '../components/Icon'
import { ItemTooltip } from '../components/ItemTooltip'
import { startFocus } from '../components/FocusController'

const XP_BARS = 7

export function HomePage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { dashboard, structure, refresh, notify } = useApp()
  if (!dashboard || !structure) return null
  const { today, week, world, xp } = dashboard
  const companion = world.companions.active
  const bondTarget = companion?.nextBondXp || 20
  const bondProgress = companion ? Math.min(100, Number(companion.bond_xp) / Math.max(1, bondTarget) * 100) : 0
  const nextTask = dashboard.nextTasks[0]
  const secondaryTask = dashboard.nextTasks[1]
  const latestExp = world.latestExpedition
  const latestRelic = world.relics[0]
  const invAll = world.inventory
  const invPreview = invAll.slice(0, 4)
  const totalItems = invAll.reduce((s, e) => s + Number(e.quantity), 0)
  const xpFilled = Math.max(1, Math.round(xp.currentXp / Math.max(1, xp.nextLevelXp) * XP_BARS))

  const completeTask = async (id: string) => {
    try {
      await window.growthArc.structure.updateTask(id, { status: 'done' })
      notify('路标已确认。地图上又清晰了一步。', 'success')
      await refresh()
    } catch (error) { notify(friendlyError(error), 'error') }
  }

  return <div className="page overview-page">
    {/* ———— 顶部出发区 ———— */}
    <section className="ov-expedition">
      <div className="ov-expedition-main">
        <div className="ov-expedition-copy">
          <span className="ov-expedition-kicker">今天的路，由你决定</span>
          <h1>{nextTask?.title || '今天还没有写下新的路标'}</h1>
          <p className="ov-expedition-sub">
            {nextTask
              ? `${structure.areas.find(a => a.id === nextTask.area_id)?.name || ''}${nextTask.status === 'doing' ? ' · 已启程' : ''}`
              : latestExp
                ? `最近远征：${latestExp.location}${latestExp.activeCompanion ? ` · 与${latestExp.activeCompanion.nickname}同行` : ''}`
                : '想出发时，城门一直为你留着'}
          </p>
        </div>
        <div className="ov-expedition-actions">
          <button className="button button-primary" onClick={() => startFocus(nextTask?.id)}>
            <Icon name="play" size={17} />开始远征
          </button>
          <button className="button button-ghost" onClick={() => onNavigate('home')}>
            <Icon name="home" size={15} />回小屋
          </button>
        </div>
      </div>
      {companion && <div className="ov-expedition-companion">
        <span className="ov-companion-label">同行</span>
        <strong>{companion.nickname}</strong>
        <span className="ov-companion-stage">{companion.stageName}</span>
      </div>}
    </section>

    {/* ———— 中部：路线板 + 近况 ———— */}
    <div className="ov-body">
      {/* 左侧：旅途路线板 */}
      <section className="ov-route">

        {/* 节点1：今日路标 */}
        <div className="ov-node ov-node-left">
          <div className="ov-node-mark ov-node-solid" />
          <div className="ov-node-body">
            <span className="ov-node-label">今日路标</span>
            {nextTask ? <>
              <TaskRow task={nextTask} areas={structure.areas} onComplete={completeTask} onFocus={startFocus} />
              {secondaryTask && <TaskRow task={secondaryTask} areas={structure.areas} onComplete={completeTask} onFocus={startFocus} />}
              {dashboard.nextTasks.length > 2 && <button className="text-button" onClick={() => onNavigate('plan')} style={{fontSize:12,marginTop:4}}>
                查看全部 {dashboard.nextTasks.length} 个路标 <Icon name="arrow" size={11} />
              </button>}
            </> : <div className="ov-empty">
              <span>今天还没有写下新的路标。</span>
              <div className="ov-empty-actions">
                <button className="text-button" onClick={() => startFocus()}>开始临时远征</button>
                <button className="text-button" onClick={() => onNavigate('plan')}>去远征地图</button>
              </div>
            </div>}
          </div>
        </div>

        <div className="ov-route-seg ov-route-seg-right" />

        {/* 节点2：最近抵达 */}
        <div className="ov-node ov-node-right">
          <div className={`ov-node-mark ${latestExp ? 'ov-node-solid' : 'ov-node-hollow'}`} />
          <div className="ov-node-body">
            <span className="ov-node-label">最近抵达</span>
            {latestExp ? <>
              <h2 className="ov-arrival-place">{latestExp.location}</h2>
              <div className="ov-arrival-meta">
                {latestExp.activeCompanion && <span>与 <strong>{latestExp.activeCompanion.nickname}</strong> 同行</span>}
              </div>
              <p className="ov-arrival-event">{latestExp.event}</p>
              {latestExp.knowledgeRelic?.content && <div className="ov-outcome">
                <p>{latestExp.knowledgeRelic.content}</p>
              </div>}
            </> : <span className="ov-node-empty-text">还没有留下新的足迹</span>}
          </div>
        </div>

        <div className="ov-route-seg ov-route-seg-left" />

        {/* 节点3：下一段路 */}
        <div className="ov-node ov-node-left">
          <div className="ov-node-mark ov-node-hollow" />
          <div className="ov-node-body">
            <span className="ov-node-label">下一段路</span>
            <button className="text-button" onClick={() => onNavigate('plan')}>
              <Icon name="compass" size={14} />前往远征地图
            </button>
          </div>
        </div>
      </section>

      {/* 右侧：行旅近况 */}
      <aside className="ov-handbook">
        <span className="ov-section-label">行旅近况</span>

        {/* 等级铭牌 */}
        <div className="ov-plaque">
          <div className="ov-plaque-badge">Lv.{xp.level}</div>
          <div className="ov-plaque-info">
            <span className="ov-plaque-sub">旅途经验</span>
            <span className="ov-plaque-nums">{xp.currentXp} / {xp.nextLevelXp} XP</span>
            <div className="ov-xp-bar">
              {Array.from({ length: XP_BARS }).map((_, i) => (
                <i key={i} className={i < xpFilled ? 'filled' : ''} />
              ))}
            </div>
          </div>
        </div>
        {xp.nextLevelXp > xp.currentXp && <div className="ov-plaque-diff">再前行 {xp.nextLevelXp - xp.currentXp} XP</div>}

        <div className="ov-handbook-sep" />

        {/* 今日 & 本周 */}
        <div className="ov-handbook-stats">
          <div className="ov-handbook-stat">
            <span>今日远征</span>
            <strong>{formatDuration(today.focusSeconds, true)}</strong>
            <em>{today.sessionCount} 次</em>
          </div>
          <div className="ov-handbook-stat">
            <span>本周旅程</span>
            <strong>{formatDuration(week.focusSeconds, true)}</strong>
            <em>{week.activeDays} 天 · {week.sessionCount} 次</em>
          </div>
        </div>

        <div className="ov-handbook-sep" />

        {/* 伙伴 */}
        {companion ? <div className="ov-handbook-companion">
          <span className="ov-handbook-sub-label">同行伙伴</span>
          <div className="ov-handbook-companion-head">
            <strong>{companion.nickname}</strong>
            <span className="ov-handbook-bond">羁绊 {companion.bond_xp || 0}</span>
          </div>
          <div className="ov-bond-track"><i style={{ width: `${Math.max(4, bondProgress)}%` }} /></div>
          <span className="ov-handbook-stage">{companion.stageName}{companion.stage < 2 ? ` · 距下一阶段 ${Math.max(0, (companion.nextBondXp || 20) - (companion.bond_xp || 0))} 羁绊` : ''}</span>
        </div> : <div className="ov-handbook-companion">
          <span className="ov-handbook-sub-label">同行伙伴</span>
          <span className="ov-node-empty-text">还没有相遇的伙伴</span>
        </div>}

        <div className="ov-handbook-sep" />

        {/* 收藏 */}
        <div className="ov-handbook-stats">
          <div className="ov-handbook-stat">
            <span>收藏</span>
            <strong>{invAll.length} 种 · {totalItems} 件</strong>
          </div>
          <div className="ov-handbook-stat">
            <span>图鉴</span>
            <strong>{world.companions.owned.length} / {world.companions.total}</strong>
          </div>
        </div>
      </aside>
    </div>

    {/* ———— 底部：返程托盘 ———— */}
    <section className="ov-return">
      <div className="ov-return-col">
        <span className="ov-section-label">带回的宝藏</span>
        {invPreview.length ? <div className="ov-return-items">
          {invPreview.map(e => (
            <ItemTag key={e.item_id} entry={e} onUse={async () => {
              try { const r = await window.growthArc.inventory.use(e.item_id); notify(r.effect, 'success'); await refresh() } catch (err) { notify(friendlyError(err), 'error') }
            }} />
          ))}
        </div> : <span className="ov-return-empty">完成远征后，宝藏会出现在这里。</span>}
        {invAll.length > 4 && <span className="ov-return-more">另有 {invAll.length - 4} 种宝藏 · 共 {totalItems} 件</span>}
      </div>

      <div className="ov-return-divider" />

      <div className="ov-return-col">
        <span className="ov-section-label">知识遗物</span>
        {latestRelic ? <div className="ov-return-relic">
          <div className="ov-relic-icon">▤</div>
          <div><strong>{latestRelic.title}</strong><p>{latestRelic.content}</p></div>
        </div> : <span className="ov-return-empty">还没有带回知识遗物。</span>}
      </div>

      <div className="ov-return-divider" />

      <div className="ov-return-col">
        <span className="ov-section-label">归来的地方</span>
        {latestExp ? <div className="ov-return-home">
          <Icon name="compass" size={16} />
          <div><strong>{latestExp.location}</strong><p>{latestExp.activeCompanion ? `与${latestExp.activeCompanion.nickname}同行` : ''}{latestExp.createdAt ? ` · ${formatDate(latestExp.createdAt)}` : ''}</p></div>
        </div> : <span className="ov-return-empty">城门开着，随时出发。</span>}
      </div>
    </section>
  </div>
}

function ItemTag({ entry, onUse }: {
  entry: { item_id: string; quantity: number; item: LootItem; updated_at: number }
  onUse: () => Promise<void>
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [hover, setHover] = useState(false)
  let timer: ReturnType<typeof setTimeout> | null = null
  const show = () => { timer = setTimeout(() => setHover(true), 200) }
  const hide = () => { if (timer) clearTimeout(timer); setHover(false) }
  return <>
    <span ref={ref} className={`ov-return-item ${entry.item.rarity}`} onClick={() => { if (window.confirm(`使用「${entry.item.name}」吗？`)) onUse() }} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <Icon name={entry.item.icon} size={18} />{entry.item.name}<em>×{entry.quantity}</em>
    </span>
    <ItemTooltip item={entry.item} quantity={entry.quantity} triggerRef={ref} visible={hover} />
  </>
}

function TaskRow({ task, areas, onComplete, onFocus }: {
  task: { id: string; title: string; area_id: string; status: string }
  areas: { id: string; name: string; color: string }[]
  onComplete: (id: string) => void
  onFocus: (id?: string) => void
}) {
  const area = areas.find(a => a.id === task.area_id)
  return <div className={`ov-task ${task.status === 'doing' ? 'is-active' : ''}`}>
    <button className="ov-task-check" onClick={() => onComplete(task.id)} title="标记完成">✓</button>
    <div className="ov-task-body">
      <span className="ov-task-title">{task.title}</span>
      <span className="ov-task-meta">
        <i style={{ background: area?.color || '#b68b5c' }} />
        {area?.name || '未分类'}
        {task.status === 'doing' && ' · 进行中'}
      </span>
    </div>
    <button className="ov-task-go" onClick={() => onFocus(task.id)}>出发</button>
  </div>
}