import type { MockLetter } from '../lib/mailMock'
import { CATEGORY_LABELS } from '../lib/mailMock'

export type LetterViewMode = 'opening' | 'archive'

interface LetterViewerProps {
  letter: MockLetter
  isRead: boolean
  sealJustBroke: boolean
  viewMode?: LetterViewMode
  /** Extra content rendered below the letter body (notes, reply, obs link, etc.) */
  children?: React.ReactNode
}

/**
 * Unified pixel-RPG letter reading view.
 * Renders the parchment paper with sender → subject → meta → body → fact summary → seal.
 * - opening mode (default): paper appears (250ms), body text appears (300ms delay).
 * - archive mode: instant display, no animations.
 */
export function LetterViewer({ letter, isRead, sealJustBroke, viewMode = 'opening', children }: LetterViewerProps) {
  const sealClass = isRead && !sealJustBroke ? 'broken' : 'intact'
  const sealBreaking = sealJustBroke ? 'breaking' : ''
  const isArchive = viewMode === 'archive'

  return (
    <div className={`mail-letter-paper ${isArchive ? 'mail-letter-paper--archive' : ''}`}>
      <div className="mail-letter-head">
        <span className="mail-letter-sender">{letter.senderName}</span>
        <h2 className="mail-letter-subject">{letter.subject}</h2>
        <div className="mail-letter-meta">
          <span className="mail-letter-cat">{CATEGORY_LABELS[letter.category]}</span>
          <span className="mail-letter-date">{letter.dateLabel}</span>
        </div>
      </div>

      <div className={`mail-letter-body ${isArchive ? 'mail-letter-body--archive' : ''}`}>
        <p className="mail-letter-text">{letter.body}</p>
      </div>

      {letter.factSummary && (letter.factSummary.focusMinutes !== undefined || letter.factSummary.waypointCount !== undefined) && (
        <div className="mail-fact-slip">
          <div className="mail-fact-slip-header">今日星页</div>
          <div className="mail-fact-slip-grid">
            {letter.factSummary.focusMinutes !== undefined && letter.factSummary.focusMinutes > 0 && <span>专注 {letter.factSummary.focusMinutes} 分</span>}
            {letter.factSummary.waypointCount !== undefined && letter.factSummary.waypointCount > 0 && <span>路标 {letter.factSummary.waypointCount} 个</span>}
            {letter.factSummary.primaryDirection && <span>{letter.factSummary.primaryDirection}</span>}
          </div>
        </div>
      )}

      <div className="mail-letter-foot">
        <span
          className={`mail-seal-standalone ${sealClass} ${sealBreaking}`}
          aria-label={isRead ? '已破蜡封' : '未读蜡封'}
        />
        <span className="mail-stamp" aria-label="邮戳" />
      </div>

      {children}
    </div>
  )
}
