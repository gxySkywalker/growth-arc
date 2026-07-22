import hearthHoundWalkAtlas from '../../assets/art/characters/companions/hearth_hound_walk_32_v1.png'
import hearthHoundManeWalkAtlas from '../../assets/art/characters/companions/hearth_hound_stage-1_walk_32_v1.png'
import '../hearth-hound-sprite.css'

type Direction = 'front' | 'back' | 'left' | 'right'
type SpriteSize = 'small' | 'medium' | 'large' | 'scene'

const rowByDirection: Record<Direction, number> = {
  front: 0,
  back: 1,
  left: 2,
  right: 3,
}

/** Renders the production 32×32 walk atlas without relying on CSS-drawn pet shapes. */
export function HearthHoundSprite({
  direction = 'front',
  frame = 0,
  size = 'large',
  sleeping = false,
  stage = 0,
}: {
  direction?: Direction
  frame?: 0 | 1 | 2 | 3
  size?: SpriteSize
  sleeping?: boolean
  stage?: number
}) {
  const x = (frame / 3) * 100
  const y = (rowByDirection[direction] / 3) * 100

  const atlas = stage >= 1 ? hearthHoundManeWalkAtlas : hearthHoundWalkAtlas
  return <span className={`hearth-hound-sprite hearth-hound-sprite-${size} ${stage >= 1 ? 'hearth-hound-sprite-grown' : ''}`} aria-hidden='true'>
    <span
      className='hearth-hound-sprite-frame'
      style={{
        backgroundImage: `url(${atlas})`,
        backgroundPosition: `${x}% ${y}%`,
      }}
    />
    {sleeping && <em className='hearth-hound-sleep-pixels'>z</em>}
  </span>
}
