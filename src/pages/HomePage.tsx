import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PageId } from '../types'
import { useApp } from '../context/AppContext'
import { formatDate, formatDuration, friendlyError } from '../lib/format'
import { Icon } from '../components/Icon'
import { PixelCompanion } from '../components/PixelCompanion'
import { startFocus } from '../components/FocusController'

export function HomePage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { dashboard, structure, refresh, notify } = useApp()
  if (!dashboard || !structure) return null
  const { today, week, world } = dashboard
  const companion = world.companions.active
  const bondTarget = companion?.nextBondXp || 20
  const bondProgress = companion ? Math.min(100, Number(companion.bond_xp) / Math.max(1, bondTarget) * 100) : 0
  const inventory = world.inventory.slice(0, 4)

  const messages = useMemo(() => {
    const list: string[] = []
    const hour = new Date().getHours()
    const name = companion?.nickname || '栗子'

    // P1 — 重要事件
    if (companion?.evolutionReady) list.push(`${name}感到体内有什么在变化……去营地看看吧。`)
    const rareItem = world.inventory.find(e => e.item.rarity === 'rare')
    if (rareItem && world.latestExpedition?.rareFound) list.push(`你看到宝箱里那道光了没有？「${rareItem.item.name}」可不常见。`)

    // P2 — 今日状态
    if (today.focusSeconds > 0) list.push(`今天走了${formatDuration(today.focusSeconds, true)}的路。每一步都算数。`)
    else list.push('还没出发吗？不着急，壁炉还暖着。')
    if (dashboard.nextTasks.length > 0) list.push(`地图上还有${dashboard.nextTasks.length}件事在等你画圈。`)
    const newCompanion = world.latestExpedition?.newCompanion
    if (newCompanion) list.push(`营地里有新的脚步声。「${newCompanion.species.name}」刚搬进来了。`)

    // P3 — 闲话
    if (hour < 7) list.push('这么晚了还在啊。炉火给你留着。')
    else if (hour < 11) list.push('早上的光刚好照在壁炉上。今天会很不错。')
    else if (hour < 17) list.push('下午的太阳把书架晒得暖烘烘的。')
    else if (hour < 22) list.push('晚上最适合在壁炉边读那些旧书了。')
    else list.push('夜深了。我守着炉火，你想待多久都行。')
    const idles = ['我在地图角落发现了一条没画完的路。', '书架上有本书翻到了你很久以前夹过书签的那页。', '壁炉里的柴偶尔会噼啪响一声。那是它在听你说话。', '你有没有发现，窗外的月亮每晚形状都不一样。']
    const i1 = Math.floor(Math.random() * idles.length)
    let i2 = Math.floor(Math.random() * (idles.length - 1))
    if (i2 >= i1) i2++
    list.push(idles[i1])
    list.push(idles[i2])
    return list
  }, [dashboard, companion, today, world, bondProgress, inventory])

  const [msgIndex, setMsgIndex] = useState(0)
  const advance = useCallback(() => setMsgIndex(i => (i + 1) % Math.min(messages.length, 5)), [messages.length])

  useEffect(() => {
    setMsgIndex(0)
    const timer = window.setInterval(advance, 8000)
    return () => window.clearInterval(timer)
  }, [messages, advance])

  const completeTask = async (id: string) => {
    try {
      await window.growthArc.structure.updateTask(id, { status: 'done' })
      notify('这项准备已经完成，地图上又清晰了一步。', 'success')
      await refresh()
    } catch (error) { notify(friendlyError(error), 'error') }
  }

  return <div className="page home-page">
    <header className="home-welcome">
      <div><span className="day-ribbon">{formatDate(Date.now())}</span><h1>欢迎回家，{dashboard.settings.user_name || '旅行者'}。</h1><p>{companion?.nickname || '伙伴'}已经收好行囊。今天想去哪里看看？</p></div>
      <div className="weather-note"><span>☁</span><div><small>营地天气</small><strong>壁炉正暖，适合出发</strong></div></div>
    </header>

    <section className="hearth-hero">
      <div className="room-window"><i className="window-moon" /><i className="window-hill hill-one" /><i className="window-hill hill-two" /></div>
      <div className="room-shelf"><i /><i /><i /></div>
      <div className="room-fireplace"><span className="fire-glow" /><span className="fire-core" /><b /></div>
      <div className="room-rug" />
      <div className="room-crate"><span>✦</span></div>
      <div className="companion-home">
        <PixelCompanion companion={companion} />
        <div className="companion-bubble" onClick={advance} title="点击切换对话">
          <strong>{companion?.nickname || '栗子'}<small style={{marginLeft:6,opacity:.5,fontSize:10}}>▸</small></strong>
          <span>{messages[msgIndex] || '……'}</span>
        </div>
      </div>
      <div className="journey-callout">
        <span className="quest-kicker">下一次远征</span>
        <h2>{dashboard.nextTasks[0]?.title || '选择一件今天想推进的事'}</h2>
        <p>专注期间我们安静赶路。回到小屋时，再一起打开带回来的宝箱。</p>
        <button className="button button-primary journey-button" onClick={() => startFocus(dashboard.nextTasks[0]?.id)}><Icon name="play" size={18} />收拾行囊，出发</button>
        <div className="odds-hint"><span>常规宝藏必定带回</span><i /><span>远征越深入，稀有发现机会越高</span></div>
      </div>
    </section>

    <section className="home-stats">
      <article><span className="stat-icon">⌛</span><div><small>今日远征</small><strong>{formatDuration(today.focusSeconds, true)}</strong><span>{today.sessionCount} 次安全返航</span></div></article>
      <article><span className="stat-icon">♧</span><div><small>本周旅程</small><strong>{formatDuration(week.focusSeconds, true)}</strong><span>{week.activeDays} 天留下足迹</span></div></article>
      <article><span className="stat-icon">♥</span><div><small>{companion?.stageName || '同行伙伴'}</small><strong>{companion?.bond_xp || 0} 羁绊</strong><span className="mini-progress"><i style={{ width: `${Math.max(4, bondProgress)}%` }} /></span></div></article>
      <article><span className="stat-icon">◇</span><div><small>伙伴图鉴</small><strong>{world.companions.owned.length} / {world.companions.total}</strong><button className="text-button" onClick={() => onNavigate('growth')}>去伙伴营地</button></div></article>
    </section>

    <section className="home-columns">
      <article className="parchment-card next-quests">
        <header><div><span className="card-sigil">ⅰ</span><div><small>远征准备</small><h2>接下来可以做</h2></div></div><button className="text-button" onClick={() => onNavigate('plan')}>打开地图</button></header>
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
