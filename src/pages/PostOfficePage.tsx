import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import type { PageId } from '../types'
import { Icon } from '../components/Icon'
import { MOCK_LETTERS, CATEGORY_LABELS, canViewObservatory, observatoryLinkLabel, type MockCategory, type MockLetter } from '../lib/mailMock'

// ── Prototype session persistence (REMOVE before production IPC) ──
const SK_READ = 'growth-arc.post-office.prototype.read-ids'
const SK_NOTES = 'growth-arc.post-office.prototype.notes'
const SK_MEMORIES = 'growth-arc.post-office.prototype.memories'
const SK_REPLIES = 'growth-arc.post-office.prototype.reply-drafts'

function loadJson<T>(key: string, fallback: T): T {
  try { const raw = sessionStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback }
  catch { return fallback }
}
function saveJson(key: string, value: unknown) { sessionStorage.setItem(key, JSON.stringify(value)) }

function letterDateLabel(l: MockLetter) { return l.dateLabel }
function letterSubLabel(l: MockLetter) {
  if (l.category === 'daily') return '每日星页'
  if (l.category === 'weekly') return '每周来信'
  if (l.category === 'festival') {
    if (l.subtype.includes('climax')) return '归灯夜'
    return '节庆来信'
  }
  if (l.category === 'memorial') return '生日祝福'
  if (l.category === 'world') return '远方来信'
  return l.category
}

type InteractionMode = 'note' | 'memory' | 'reply' | 'none'

function getInteractionMode(letter: MockLetter): InteractionMode {
  if (letter.category === 'daily' || letter.category === 'weekly') return 'note'
  if (letter.category === 'festival' || letter.category === 'memorial') return 'memory'
  if (letter.category === 'world') return 'reply'
  return 'none'
}

interface PostOfficePageProps { onNavigate?: (page: PageId) => void }

export function PostOfficePage({ onNavigate }: PostOfficePageProps) {
  const [activeCategory, setActiveCategory] = useState<MockCategory>('new')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(loadJson<string[]>(SK_READ, [])))
  const [noteMap, setNoteMap] = useState<Record<string, string>>(() => loadJson(SK_NOTES, {}))
  const [memoryMap, setMemoryMap] = useState<Record<string, string>>(() => loadJson(SK_MEMORIES, {}))
  const [replyMap, setReplyMap] = useState<Record<string, string>>(() => loadJson(SK_REPLIES, {}))
  const [memoryOpen, setMemoryOpen] = useState<Record<string, boolean>>({})
  const [sealJustBroke, setSealJustBroke] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openAnimTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [newSnapshot, setNewSnapshot] = useState<MockLetter[]>(() => MOCK_LETTERS.new.filter(l => !readIds.has(l.id)))

  const flushRead = useCallback(() => {
    if (readTimer.current) clearTimeout(readTimer.current); readTimer.current = null
    saveJson(SK_READ, [...readIds])
  }, [readIds])
  const persistMaps = useCallback(() => {
    saveJson(SK_NOTES, noteMap); saveJson(SK_MEMORIES, memoryMap); saveJson(SK_REPLIES, replyMap)
  }, [noteMap, memoryMap, replyMap])

  useEffect(() => { flushRead() }, [flushRead])
  useEffect(() => { persistMaps() }, [persistMaps])
  // Dev: reset birthday read state on refresh for testing
  useEffect(() => {
    if ((import.meta as any).env?.DEV) {
      setReadIds(prev => { const n = new Set(prev); MOCK_LETTERS.memorial.forEach(l => n.delete(l.id)); saveJson(SK_READ, [...n]); return n })
    }
  }, [])

  useEffect(() => () => { if (readTimer.current) clearTimeout(readTimer.current) }, [])

  // Rebuild new-snapshot on navigation away/back
  useEffect(() => {
    if (activeCategory !== 'new') {
      setNewSnapshot(MOCK_LETTERS.new.filter(l => !readIds.has(l.id)))
    }
  }, [activeCategory, readIds])

  const unreadNewSnapshot = useMemo(() => newSnapshot.filter(l => !readIds.has(l.id)), [newSnapshot, readIds])
  const letters = activeCategory === 'new' ? newSnapshot : (MOCK_LETTERS[activeCategory] || [])
  const hasUnread = unreadNewSnapshot.length > 0
  const allMockLetters = MOCK_LETTERS.all

  const categories: MockCategory[] = [
    ...(newSnapshot.length > 0 ? ['new' as MockCategory] : []),
    'daily', 'weekly', 'festival', 'memorial', 'world', 'all',
  ]

  const categoryHasUnread = (cat: MockCategory) => {
    if (cat === 'new' || cat === 'all') return false
    return MOCK_LETTERS[cat]?.some(l => !readIds.has(l.id)) ?? false
  }

  useEffect(() => {
    if (letters.length > 0 && !letters.find(l => l.id === selectedId)) {
      setSelectedId(letters[0].id)
    }
  }, [activeCategory])

  const selectedLetter = allMockLetters.find(l => l.id === selectedId) || null

  const markRead = (id: string) => {
    if (!readIds.has(id)) {
      setReadIds(prev => new Set([...prev, id]))
      setSealJustBroke(id)
      if (readTimer.current) clearTimeout(readTimer.current)
      readTimer.current = setTimeout(() => { setSealJustBroke(null); flushRead() }, 1000)
    }
  }

  const openLetter = (letter: MockLetter) => {
    setSelectedId(letter.id)
    if (!readIds.has(letter.id)) {
      setOpeningId(letter.id)
      if (openAnimTimer.current) clearTimeout(openAnimTimer.current)
      openAnimTimer.current = setTimeout(() => setOpeningId(null), 480)
    }
    markRead(letter.id)
  }

  useEffect(() => () => {
    if (readTimer.current) clearTimeout(readTimer.current)
    if (openAnimTimer.current) clearTimeout(openAnimTimer.current)
  }, [])

  const getValue = (letter: MockLetter): string => {
    const mode = getInteractionMode(letter)
    if (mode === 'note') return noteMap[letter.id] ?? ''
    if (mode === 'memory') return memoryMap[letter.id] ?? ''
    if (mode === 'reply') return replyMap[letter.id] ?? (letter.replyText || '')
    return ''
  }
  const setValue = (letter: MockLetter, value: string) => {
    const mode = getInteractionMode(letter)
    if (mode === 'note') setNoteMap(prev => ({ ...prev, [letter.id]: value }))
    if (mode === 'memory') setMemoryMap(prev => ({ ...prev, [letter.id]: value }))
    if (mode === 'reply') setReplyMap(prev => ({ ...prev, [letter.id]: value }))
  }
  const hasValue = (letter: MockLetter) => getValue(letter).trim().length > 0

  const cubbyPanel = (
    <div className="mail-cubby">
      <div className="mail-cubby-tabs">
        {categories.map(cat => (
          <button
            key={cat}
            className={`mail-cubby-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => { setActiveCategory(cat); setSelectedId(null); if (cat !== 'new') setNewSnapshot(MOCK_LETTERS.new.filter(l => !readIds.has(l.id))) }}
            aria-label={CATEGORY_LABELS[cat]}
          >
            <span>{CATEGORY_LABELS[cat]}</span>
            {categoryHasUnread(cat) && <span className="mail-cat-unread" />}
          </button>
        ))}
      </div>
      <div className="mail-env-list">
        {letters.map(letter => {
          const isUnread = !readIds.has(letter.id)
          const isSelected = selectedId === letter.id
          const replied = hasValue(letter)
          const isSpecial = letter.category === 'festival' || letter.category === 'memorial'
          const envSrc = !isUnread ? 'assets/art/mail/mail_read.png'
            : isSpecial ? 'assets/art/mail/mail_special.png'
            : 'assets/art/mail/mail_unread.png'
          return (
            <button
              key={letter.id}
              className={`mail-env ${isSelected ? 'selected' : ''} ${isUnread ? 'unread' : 'read'} ${openingId === letter.id ? 'opening' : ''}`}
              onClick={() => openLetter(letter)}
              aria-label={`${letter.subject} — ${letter.senderName}`}
            >
              <img className="mail-env-visual" src={envSrc} alt="" />
              <span className="mail-env-info">
                <span className="mail-env-subject">{letter.subject}</span>
                <span className="mail-env-meta">{letterDateLabel(letter)} · {letterSubLabel(letter)}</span>
              </span>
              <span className="mail-env-reply-mark">{replied ? '✎' : ''}</span>
            </button>
          )
        })}
        {letters.length === 0 && <div className="mail-empty">这里还没有信。</div>}
      </div>
    </div>
  )

  const letterInteraction = selectedLetter && (() => {
    const mode = getInteractionMode(selectedLetter)
    const val = getValue(selectedLetter)
    const saved = hasValue(selectedLetter)
    const setV = (v: string) => setValue(selectedLetter, v)

    if (mode === 'none') return null
    if (mode === 'note') {
      const label = selectedLetter.category === 'weekly' ? '留一句给这一周的话……' : '在今天的星页旁留一句话……'
      return <div className="mail-reply-slip"><span className="mail-reply-icon">✎</span><textarea className="mail-reply-input" rows={1} placeholder={label} value={val} onChange={e => setV(e.target.value)} />{saved && <span className="mail-reply-saved">已夹进信里</span>}</div>
    }
    if (mode === 'memory') {
      const isOpen = memoryOpen[selectedLetter.id] || saved
      if (!isOpen) return <div className="mail-memory-toggle"><button className="text-button" onClick={() => setMemoryOpen(prev => ({ ...prev, [selectedLetter.id]: true }))}>✎ 在这封信后留一句话</button></div>
      return <div className="mail-reply-slip"><span className="mail-reply-icon">✎</span><textarea className="mail-reply-input" rows={1} placeholder="写下今年想记住的一句话……" value={val} onChange={e => setV(e.target.value)} />{saved && <span className="mail-reply-saved">已随这封信收好</span>}</div>
    }
    if (mode === 'reply') {
      return <div className="mail-reply-slip"><span className="mail-reply-icon">✎</span><textarea className="mail-reply-input" rows={1} placeholder={`回给${selectedLetter.senderName}……`} value={val} onChange={e => setV(e.target.value)} />{saved && <span className="mail-reply-saved">回信草稿已收好</span>}</div>
    }
    return null
  })()

  const showObsLink = selectedLetter && canViewObservatory(selectedLetter)

  const letterPaper = (
    <div className="mail-letter-paper">
      {selectedLetter ? (<>
        <div className="mail-letter-head">
          <div><span className="mail-letter-cat">{CATEGORY_LABELS[selectedLetter.category]}</span><span className="mail-letter-date">{selectedLetter.dateLabel}</span></div>
          <span className="mail-letter-sender">{selectedLetter.senderName}</span>
          <h2 className="mail-letter-subject">{selectedLetter.subject}</h2>
        </div>
        <div className="mail-letter-body"><p className="mail-letter-text">{selectedLetter.body}</p></div>
        {selectedLetter.factSummary && (selectedLetter.factSummary.focusMinutes !== undefined || selectedLetter.factSummary.waypointCount !== undefined) && (
          <div className="mail-fact-slip"><div className="mail-fact-slip-header">今日星页</div><div className="mail-fact-slip-grid">
            {selectedLetter.factSummary.focusMinutes !== undefined && selectedLetter.factSummary.focusMinutes > 0 && <span>专注 {selectedLetter.factSummary.focusMinutes} 分</span>}
            {selectedLetter.factSummary.waypointCount !== undefined && selectedLetter.factSummary.waypointCount > 0 && <span>路标 {selectedLetter.factSummary.waypointCount} 个</span>}
            {selectedLetter.factSummary.primaryDirection && <span>{selectedLetter.factSummary.primaryDirection}</span>}
          </div></div>
        )}
        <div className="mail-letter-foot">
          <span className={`mail-seal-standalone ${readIds.has(selectedLetter.id) && selectedLetter.id !== sealJustBroke ? 'broken' : 'intact'} ${selectedLetter.id === sealJustBroke ? 'breaking' : ''}`} aria-label={readIds.has(selectedLetter.id) ? '已破蜡封' : '未读蜡封'} />
          <span className="mail-stamp" aria-label="邮戳" />
        </div>
        {letterInteraction}
        {showObsLink && <div className="mail-obs-link"><button className="text-button" onClick={() => onNavigate?.('observatory')}><Icon name="star" size={13} /> {observatoryLinkLabel(selectedLetter)}</button></div>}
      </>) : <div className="mail-empty mail-empty-letter">从左边选一封信来读吧。</div>}
    </div>
  )

  return <div className="page mail-page">
    <div className="mail-header">
      <div className="mail-header-bg" data-asset-placeholder="post-office-background" />
      <div className="mail-header-props"><div className="mail-header-prop" data-asset-placeholder="window" /><div className="mail-header-prop" data-asset-placeholder="mail-sack" /><div className="mail-header-prop mail-header-prop-lamp" data-asset-placeholder="lamp" /></div>
      <div className="mail-header-angel" data-asset-placeholder="angel" />
      <div className="mail-header-foreground" data-asset-placeholder="counter" />
      <div className="mail-header-text">
        <div className="mail-header-title"><span className="eyebrow">POST OFFICE</span><h1>天使邮局</h1><p className="mail-header-season">盛夏 · 窗边吹来一点暖风</p></div>
        <div className="mail-header-hint">{hasUnread ? '有一封信刚刚放进了你的木格。' : '今天的邮袋已经整理好了。'}</div>
      </div>
    </div>
    <div className="mail-workspace">
      <div className="mail-cubby-col mail-cubby-narrow-hide">{cubbyPanel}</div>
      <div className="mail-desk-col mail-desk-narrow-full">
        <button className="text-button mail-back-btn" onClick={() => setSelectedId(null)}>← 回到信件列表</button>
        <div className="mail-desk">{letterPaper}</div>
      </div>
    </div>
  </div>
}
