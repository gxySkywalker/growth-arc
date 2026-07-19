import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function Modal({ title, children, onClose, size = 'normal', className }: { title: string; children: ReactNode; onClose: () => void; size?: 'normal' | 'wide'; className?: string }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={`modal ${size === 'wide' ? 'modal-wide' : ''} ${className || ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="关闭"><Icon name="close" /></button></header>
      {children}
    </section>
  </div>
}
