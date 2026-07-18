import type { PageId } from '../types'
import { useApp } from '../context/AppContext'
import { formatDate, formatDuration, friendlyError } from '../lib/format'
import { Icon } from '../components/Icon'
import { startFocus } from '../components/FocusController'

export function HomePage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { dashboard, structure, refresh, notify } = useApp()
  if (!dashboard || !structure) return null
  const { today, week, world } = dashboard
  const companion = world.companions.active
  const bondTarget = companion?.nextBondXp || 20
  const bondProgress = companion ? Math.min(100, Number(companion.bond_xp) / Math.max(1, bondTarget) * 100) : 0
  const inventory = world.inventory.slice(0, 4)

  const completeTask = async (id: string) => {
    try {
      await window.growthArc.structure.updateTask(id, { status: 'done' })
      notify('这项准备已经完成，地图上又清晰了一步。', 'success')
      await refresh()
    } catch (error) { notify(friendlyError(error), 'error') }
  }

  return <div className="page home-page">
    <header className="home-welcome">
      <div><span className="day-ribbon">{formatDate(Date.now())}</span><h1>旅程总览</h1><p>这里收藏走过的路、带回的宝藏和遇见的伙伴。安静翻看就好。</p></div>
      <div className="weather-note"><span>♜</span><div><small>当前常伴伙伴</small><strong>{companion?.nickname || '尚未选择'}</strong></div></div>
    </header>

    <section className='overview-expedition-card'>
      <div>
        <span className='quest-kicker'>城门一直为你留着</span>
        <h2>下一次远征由你决定</h2>
        <p>想出发时再整理行囊；想休息时，就先回小屋和伙伴待一会儿。</p>
      </div>
      <div className='overview-expedition-actions'>
        <button className='button button-primary' onClick={() => startFocus()}><Icon name='play' size={18} />开始远征</button>
        <button className='button button-secondary' onClick={() => onNavigate('home')}><Icon name='home' size={18} />回到炉火小屋</button>
      </div>
    </section>

    <section className="xp-bar">
      <div className="xp-level-badge">Lv.{dashboard.xp.level}</div>
      <div className="xp-track">
        <i style={{ width: `${Math.max(2, dashboard.xp.progress * 100)}%` }} />
      </div>
      <span>{dashboard.xp.currentXp} / {dashboard.xp.nextLevelXp} XP</span>
    </section>

    <section className="home-stats">
      <article><span className="stat-icon">⌛</span><div><small>今日远征</small><strong>{formatDuration(today.focusSeconds, true)}</strong><span>{today.sessionCount} 次安全返航</span></div></article>
      <article><span className="stat-icon">♧</span><div><small>本周旅程</small><strong>{formatDuration(week.focusSeconds, true)}</strong><span>{week.activeDays} 天留下足迹</span></div></article>
      <article><span className="stat-icon">♥</span><div><small>{companion?.stageName || '同行伙伴'}</small><strong>{companion?.bond_xp || 0} 羁绊</strong><span className="mini-progress"><i style={{ width: `${Math.max(4, bondProgress)}%` }} /></span></div></article>
      <article><span className="stat-icon">◇</span><div><small>伙伴图鉴</small><strong>{world.companions.owned.length} / {world.companions.total}</strong><button className="text-button" onClick={() => onNavigate('growth')}>去伙伴营地</button></div></article>
    </section>

    <section className="home-columns">
      <article className="parchment-card next-quests">
        <header><div><span className="card-sigil">ⅰ</span><div><small>地图上的路标</small><h2>暂存的远征事项</h2></div></div><button className="text-button" onClick={() => onNavigate('plan')}>打开地图</button></header>
        <div className="quest-list">
          {dashboard.nextTasks.length ? dashboard.nextTasks.slice(0, 4).map((task) => {
            const area = structure.areas.find((item) => item.id === task.area_id)
            return <div className="quest-row" key={task.id}>
              <button className="wax-check" onClick={() => void completeTask(task.id)} aria-label={`完成 ${task.title}`}>✓</button>
              <div><strong>{task.title}</strong><span><i style={{ background: area?.color }} />{area?.name || '未分类'}{task.status === 'doing' ? ' · 已启程' : ''}</span></div>
              <button className="quest-go" onClick={() => startFocus(task.id)}>出发</button>
            </div>
          }) : <div className="cozy-empty"><span>☕</span><strong>行囊暂时是空的</strong><p>可以直接开始一次临时远征，或先去地图上写下目标。</p></div>}
        </div>
      </article>

      <article className="parchment-card treasure-shelf">
        <header><div><span className="card-sigil">✦</span><div><small>小屋收藏</small><h2>最近带回的宝藏</h2></div></div><span className="soft-count">{world.inventory.length} 种</span></header>
        <div className="loot-grid">
          {inventory.length ? inventory.map((entry) => <div className={`loot-tile ${entry.item.rarity}`} key={entry.item_id} title={`点击使用 —— ${entry.item.description}`} style={{cursor:'pointer'}} onClick={async () => { if (!window.confirm(`使用「${entry.item.name}」吗？`)) return; try { const r = await window.growthArc.inventory.use(entry.item_id); notify(r.effect, 'success'); await refresh() } catch (e) { notify(friendlyError(e), 'error') } }}>
            <span className="loot-glyph"><Icon name={entry.item.icon} size={22} /></span>
            <strong>{entry.item.name}</strong><small>× {entry.quantity}</small>
          </div>) : <div className="cozy-empty compact"><span>🗝</span><strong>第一只宝箱在等你</strong><p>完成远征后，收藏会出现在这里。</p></div>}
        </div>
        {world.latestExpedition && <footer className="last-expedition"><span>最近足迹</span><strong>{world.latestExpedition.location}</strong><p>{world.latestExpedition.event}</p></footer>}
      </article>
    </section>

    {world.relics.length > 0 && <section className="knowledge-strip">
      <div className="knowledge-mark">▤</div>
      <div><small>最近带回的知识遗物</small><strong>{world.relics[0].title}</strong><p>{world.relics[0].content}</p></div>
      <span>{new Date(world.relics[0].created_at).toLocaleDateString('zh-CN')}</span>
    </section>}
  </div>
}
