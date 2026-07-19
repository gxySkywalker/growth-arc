import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LootItem } from '../types'
import { Icon } from './Icon'
import { getItemLore } from '../lib/item-lore'

interface ItemTooltipProps {
  item: LootItem
  quantity?: number
  triggerRef: React.RefObject<HTMLElement | null>
  visible: boolean
}

export function ItemTooltip({ item, quantity, triggerRef, visible }: ItemTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 })

  useEffect(() => {
    if (!visible || !triggerRef.current) return
    const trigger = triggerRef.current
    const rect = trigger.getBoundingClientRect()
    const tooltipW = 260
    const tooltipH = 160
    const gap = 8
    let left = Math.round(rect.left + rect.width / 2 - tooltipW / 2)
    let top = Math.round(rect.top - tooltipH - gap)
    // clamp horizontal
    if (left < 8) left = 8
    if (left + tooltipW > window.innerWidth - 8) left = window.innerWidth - tooltipW - 8
    // flip below if not enough room above
    if (top < 8) top = Math.round(rect.bottom + gap)
    setPos({ left, top })
  }, [visible, triggerRef])

  if (!visible) return null

  const lore = getItemLore(item)

  return createPortal(
    <div
      ref={tooltipRef}
      className="item-tooltip"
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="item-tooltip-head">
        <span className="item-tooltip-icon"><Icon name={item.icon} size={24} /></span>
        <div>
          <strong className="item-tooltip-name">{item.name}</strong>
          <span className={`item-tooltip-rarity ${item.rarity}`}>
            {item.rarity === 'rare' ? '稀有' : '普通'}
          </span>
        </div>
      </div>
      <p className="item-tooltip-desc">{item.description}</p>
      {lore.effectLabel && <div className="item-tooltip-effect">
        <span className="item-tooltip-effect-label">使用效果</span>
        <span className="item-tooltip-effect-text">{lore.effectLabel}</span>
        {lore.consumesItem && <span className="item-tooltip-consume">使用后消耗</span>}
      </div>}
      {!lore.effectLabel && <p className="item-tooltip-pending">用途仍在旅途中逐渐揭晓</p>}
      {quantity !== undefined && <div className="item-tooltip-foot">
        当前持有 <strong>{quantity}</strong> 件
      </div>}
    </div>,
    document.body,
  )
}
