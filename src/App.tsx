import { useState, useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { FocusController } from './components/FocusController'
import { Icon } from './components/Icon'
import { bgm } from './lib/audio'
import { HomePage } from './pages/HomePage'
import { CottagePage } from './pages/CottagePage'
import { PlanPage } from './pages/PlanPage'
import { HistoryPage } from './pages/HistoryPage'
import { ReviewPage } from './pages/ReviewPage'
import { GrowthPage } from './pages/GrowthPage'
import { SettingsPage } from './pages/SettingsPage'
import type { PageId } from './types'

const NAV: Array<{ id: PageId; label: string; icon: string }> = [
  { id: 'home', label: '炉火小屋', icon: 'home' },
  { id: 'overview', label: '旅程总览', icon: 'book' },
  { id: 'plan', label: '制图室', icon: 'plan' },
  { id: 'growth', label: '伙伴营地', icon: 'growth' },
  { id: 'history', label: '旅途编年史', icon: 'history' },
  { id: 'review', label: '天使来信', icon: 'review' },
]

function AppShell() {
  const [page, setPage] = useState<PageId>('home')
  const [muted, setMuted] = useState(false)
  const [vol, setVol] = useState(0.35)
  const { dashboard, loading } = useApp()

  useEffect(() => {
    bgm.play('assets/audio/bgm/cottage.mp3')
  }, [])
  if (loading) return <div className="app-loading"><div className="loading-fire">◆</div><strong>正在点亮壁炉</strong><span>伙伴们在整理昨夜的行囊…</span></div>
  const worldName = dashboard?.world.name || '炉火营地'
  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setPage('home')}>
        <span className="brand-crest">♜</span>
        <span><strong>{worldName}</strong><small>你的私人远征小屋</small></span>
      </button>
      <nav>{NAV.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-bottom">
        <button onClick={() => { const next = !muted; setMuted(next); bgm.volume(next ? 0 : bgm.getLastVolume()) }} title={muted ? '开启背景音乐' : '静音'}><Icon name={muted ? 'spark' : 'play'} /><span>{muted ? '音乐已关' : '背景音乐'}</span></button>
        <div className="volume-slider"><Icon name="play" size={14} /><input type="range" min="0" max="100" value={muted ? 0 : Math.round(vol * 100)} onChange={e => { const v = Number(e.target.value) / 100; setVol(v); setMuted(false); bgm.volume(v) }} /><Icon name="play" size={18} /></div>
        <button className={page === 'settings' ? 'active' : ''} onClick={() => setPage('settings')}><Icon name="settings" /><span>小屋设置</span></button>
        <div className="local-badge"><i /><span>旅程只保存在本地</span></div>
      </div>
    </aside>
    <main className={`main-content ${page === 'home' ? 'cottage-main-content' : ''}`}>
      {page === 'home' && <CottagePage onNavigate={setPage} />}
      {page === 'overview' && <HomePage onNavigate={setPage} />}
      {page === 'plan' && <PlanPage />}
      {page === 'history' && <HistoryPage />}
      {page === 'review' && <ReviewPage />}
      {page === 'growth' && <GrowthPage />}
      {page === 'settings' && <SettingsPage />}
    </main>
    <FocusController showLauncher={false} />
  </div>
}

export default function App() {
  return <AppProvider><AppShell /></AppProvider>
}
