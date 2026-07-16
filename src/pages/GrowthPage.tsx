import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { PixelCompanion } from '../components/PixelCompanion'
import { friendlyError } from '../lib/format'

export function GrowthPage() {
  const { dashboard, refresh, notify } = useApp()
  const [selectedId, setSelectedId] = useState('')
  if (!dashboard) return null
  const { companions, inventory } = dashboard.world
  const selected = companions.owned.find((item) => item.id === selectedId) || companions.active || companions.owned[0] || null

  const travelWith = async (id: string) => {
    try {
      await window.growthArc.companions.setActive(id)
      notify('同行伙伴已经换好行囊。', 'success')
      await refresh()
    } catch (error) { notify(friendlyError(error), 'error') }
  }

  const evolve = async (pathId: string) => {
    if (!selected) return
    try {
      const evolved = await window.growthArc.companions.evolve(selected.id, pathId)
      notify(`${evolved.nickname}进化成了「${evolved.stageName}」！`, 'success')
      await refresh()
    } catch (error) { notify(friendlyError(error), 'error') }
  }

  return <div className="page companions-page">
    <header className="page-heading cozy-heading"><div><span className="day-ribbon">伙伴营地</span><h1>每一次同行，都会留下变化。</h1><p>伙伴不是装备。他们会记得一起走过的远征，也会在足够深的羁绊中选择新的形态。</p></div><div className="collection-count"><strong>{companions.owned.length}</strong><span>/ {companions.total} 已相遇</span></div></header>

    <section className="companion-camp">
      <aside className="companion-list">
        {companions.owned.map((companion) => <button key={companion.id} onClick={() => setSelectedId(companion.id)} className={selected?.id === companion.id ? 'selected' : ''}>
          <PixelCompanion companion={companion} size="small" />
          <span><strong>{companion.nickname}</strong><small>{companion.stageName}</small></span>
          {companion.is_active ? <b>同行中</b> : null}
        </button>)}
      </aside>

      {selected && <article className="companion-profile">
        <div className="profile-scene"><div className="camp-tent" /><div className="camp-lantern">✦</div><PixelCompanion companion={selected} /></div>
        <div className="profile-details">
          <span className={`rarity-label ${selected.species.rarity}`}>{selected.species.rarity === 'rare' ? '稀有伙伴' : selected.species.rarity === 'starter' ? '最初的伙伴' : '旅行伙伴'}</span>
          <h2>{selected.nickname}</h2>
          <h3>{selected.stageName} · {selected.species.kind}</h3>
          <p>{selected.species.description}</p>
          <div className="bond-block"><div><span>羁绊</span><strong>{selected.bond_xp} / {selected.stage === 2 ? selected.bond_xp : selected.nextBondXp}</strong></div><div className="bond-track"><i style={{ width: `${selected.stage === 2 ? 100 : Math.min(100, selected.bond_xp / selected.nextBondXp * 100)}%` }} /></div><small>{selected.evolutionReady ? '已经准备好选择最终的成长方向。' : selected.stage === 2 ? '这段关系还会继续写下新的故事。' : '带它参加远征，就能慢慢加深羁绊。'}</small></div>
          {!selected.is_active && <button className="button button-primary" onClick={() => void travelWith(selected.id)}>邀请它同行</button>}
        </div>
      </article>}
    </section>

    {selected?.evolutionReady && <section className="evolution-choice parchment-card">
      <header><div><span className="card-sigil">✦</span><div><small>羁绊进化</small><h2>{selected.nickname}正在等待你的选择</h2></div></div></header>
      <p>两个方向都来自你们共同积累的旅程。选择后不会失去过去的形态记录。</p>
      <div>{selected.species.evolutions.map((path) => <button key={path.id} onClick={() => void evolve(path.id)}><span>◆</span><strong>{path.name}</strong><small>{path.note}</small></button>)}</div>
    </section>}

    <section className="camp-lower-grid">
      <article className="parchment-card">
        <header><div><span className="card-sigil">◇</span><div><small>伙伴图鉴</small><h2>仍在旅途中的朋友</h2></div></div></header>
        <div className="catalog-grid">{companions.catalog.map((species) => <div className={species.discovered ? 'discovered' : 'unknown'} key={species.id}>
          <span>{species.discovered ? '◆' : '?'}</span><strong>{species.discovered ? species.name : '尚未相遇'}</strong><small>{species.discovered ? species.kind : '完成远征时可能听见新的脚步声'}</small>
        </div>)}</div>
      </article>
      <article className="parchment-card backpack-card">
        <header><div><span className="card-sigil">▣</span><div><small>共同背包</small><h2>远征收藏</h2></div></div><span className="soft-count">{inventory.reduce((sum, entry) => sum + Number(entry.quantity), 0)} 件</span></header>
        <div>{inventory.slice(0, 8).map((entry) => <div className={entry.item.rarity} key={entry.item_id}><span>{entry.item.rarity === 'rare' ? '✦' : '◆'}</span><strong>{entry.item.name}</strong><b>×{entry.quantity}</b></div>)}{inventory.length === 0 && <p className="empty-copy">第一次返航后，宝藏会被整齐收在这里。</p>}</div>
      </article>
    </section>
  </div>
}
