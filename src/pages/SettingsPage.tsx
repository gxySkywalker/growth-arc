import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { useApp } from '../context/AppContext'
import { friendlyError } from '../lib/format'

const ACCENTS = ['#8b9cff', '#79d8b5', '#f4bd70', '#e98aa6', '#77bdfb', '#bc91ef']

export function SettingsPage() {
  const { refresh, notify } = useApp()
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState('gpt-5.6-luna')
  const [proxyUrl, setProxyUrl] = useState('')
  const [accent, setAccent] = useState('#8b9cff')
  const [hasKey, setHasKey] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    window.growthArc.settings.get().then((data) => {
      setName(String(data.user_name || '学习者')); setProvider(String(data.api_provider || 'openai')); setModel(String(data.model || 'gpt-5.6-luna')); setProxyUrl(String(data.proxy_url || '')); setAccent(String(data.accent || '#8b9cff')); setHasKey(Boolean(data.hasApiKey))
    }).catch((error) => notify(friendlyError(error), 'error'))
  }, [notify])

  const saveProfile = async () => {
    setBusy(true)
    try {
      await window.growthArc.settings.set({ user_name: name, model, accent, proxy_url: proxyUrl, api_provider: provider })
      document.documentElement.style.setProperty('--accent', accent)
      notify('个性设置已保存', 'success'); await refresh()
    } catch (error) { notify(friendlyError(error), 'error') }
    finally { setBusy(false) }
  }
  const saveKey = async () => {
    setBusy(true)
    try { await window.growthArc.settings.setApiKey(apiKey); setApiKey(''); setHasKey(true); notify('API Key 已使用 Windows DPAPI 加密保存', 'success') }
    catch (error) { notify(friendlyError(error), 'error') }
    finally { setBusy(false) }
  }
  const clearKey = async () => {
    try { await window.growthArc.settings.clearApiKey(); setHasKey(false); notify('API Key 已从本机删除') }
    catch (error) { notify(friendlyError(error), 'error') }
  }

  return <div className="page settings-page">
    <header className="page-heading"><div><span className="eyebrow">PREFERENCES</span><h1>让它更像你的空间。</h1><p>学习数据只留在这台电脑；只有你主动生成 AI 报告时才会发送当期数据。</p></div></header>
    <div className="settings-stack">
      <section className="panel settings-section"><header><div className="setting-icon"><Icon name="spark" /></div><div><h2>个人档案</h2><p>这些信息只用于本地界面和角色展示。</p></div></header><div className="settings-form"><label>显示名称<input value={name} onChange={(event) => setName(event.target.value)} /></label><fieldset className="color-picker"><legend>主题强调色</legend>{ACCENTS.map((item) => <button key={item} className={accent === item ? 'active' : ''} style={{ background: item }} onClick={() => setAccent(item)} aria-label={item} />)}</fieldset><button className="button button-primary align-end" disabled={busy || !name.trim()} onClick={saveProfile}>保存档案</button></div></section>
      <section className="panel settings-section"><header><div className="setting-icon"><Icon name="brain" /></div><div><h2>OpenAI 学习报告</h2><p>使用 Responses API 生成结构化日评和周报；API 使用独立计费。</p></div><span className={`status-pill ${hasKey ? 'connected' : ''}`}>{hasKey ? '已配置' : '未配置'}</span></header><div className="settings-form ai-settings"><label>API 提供商<select value={provider} onChange={(event) => { const v = event.target.value; setProvider(v); setModel(v === 'deepseek' ? 'deepseek-chat' : 'gpt-5.6-luna') }}><option value="openai">OpenAI</option><option value="deepseek">DeepSeek</option></select><small>切换提供商会自动调整默认模型</small></label><label>模型名称<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="gpt-5.6-luna" /><small>默认选择低成本模型；如不可用，可填写你账户有权使用的模型。</small></label><label>代理地址（可选）<input value={proxyUrl} onChange={(event) => setProxyUrl(event.target.value)} placeholder="http://127.0.0.1:7897" /><small>如果直连 OpenAI API 失败，可填写本地代理地址。留空则不使用代理。</small></label><label>OpenAI API Key<input type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={hasKey ? '已安全保存；输入新值可替换' : 'sk-…'} /><small>密钥由 Windows DPAPI 加密，不进入数据库、前端状态持久化或日志。</small></label><div className="button-row">{hasKey && <button className="button button-danger-ghost" onClick={clearKey}>删除密钥</button>}<button className="button button-secondary" disabled={busy || !apiKey.trim()} onClick={saveKey}>安全保存密钥</button><button className="button button-primary" disabled={busy || !model.trim()} onClick={saveProfile}>保存模型设置</button></div></div></section>
      <section className="panel settings-section"><header><div className="setting-icon"><Icon name="folder" /></div><div><h2>本地数据</h2><p>SQLite 数据库位于应用专用目录。首版不上传、不同步、不自动备份。</p></div></header><div className="data-boundary"><div><strong>你始终拥有原始数据文件</strong><span>需要自行备份时，可关闭应用后复制整个目录。</span></div><button className="button button-secondary" onClick={() => window.growthArc.settings.openDataFolder()}><Icon name="folder" size={16} />打开数据目录</button></div></section>
      <section className="privacy-note"><Icon name="spark" /><div><strong>温和反馈原则</strong><p>系统不会因为断档扣除经验、清零进度或发送催促学习通知。休息本身不是失败。</p></div></section>
    </div>
  </div>
}
