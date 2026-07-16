import type { Companion } from '../types'

export function PixelCompanion({ companion, size = 'large', sleeping = false }: { companion: Companion | null; size?: 'small' | 'medium' | 'large'; sleeping?: boolean }) {
  const speciesId = companion?.species_id || 'hearth_hound'
  const palette = companion?.species?.palette || 'honey'
  return <div
    className={`pixel-companion sprite-${speciesId} palette-${palette} sprite-${size} stage-${companion?.stage || 0} ${sleeping ? 'is-sleeping' : ''}`}
    role="img"
    aria-label={companion ? `${companion.nickname}，${companion.stageName}` : '等待同行的伙伴'}
  >
    <i className="sprite-shadow" />
    <i className="sprite-tail" />
    <i className="sprite-wing sprite-wing-back" />
    <i className="sprite-body" />
    <i className="sprite-wing sprite-wing-front" />
    <i className="sprite-head">
      <b className="sprite-ear sprite-ear-left" />
      <b className="sprite-ear sprite-ear-right" />
      <b className="sprite-eye sprite-eye-left" />
      <b className="sprite-eye sprite-eye-right" />
      <b className="sprite-snout" />
    </i>
    <i className="sprite-foot sprite-foot-left" />
    <i className="sprite-foot sprite-foot-right" />
    {sleeping && <em className="sleep-pixels">z</em>}
  </div>
}
