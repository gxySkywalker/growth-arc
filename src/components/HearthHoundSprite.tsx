import hearthHoundWalkAtlas from '../../assets/art/characters/companions/hearth_hound_walk_32_v1.png'
import hearthHoundManeWalkAtlas from '../../assets/art/characters/companions/hearth_hound_stage-1_walk_32_v1.png'
import hearthHoundEmberTailWalkAtlas from '../../assets/art/characters/companions/hearth_hound_ember_tail_walk_32_v1.png'
import hearthHoundPineShadowWalkAtlas from '../../assets/art/characters/companions/hearth_hound_pine_shadow_walk_32_v1.png'
import hearthHoundMoonPawWalkAtlas from '../../assets/art/characters/companions/hearth_hound_moon_paw_walk_32_v1.png'
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
  evolutionPath = '',
}: {
  direction?: Direction
  frame?: 0 | 1 | 2 | 3
  size?: SpriteSize
  sleeping?: boolean
  stage?: number
  evolutionPath?: string
}) {
  const x = (frame / 3) * 100
  const y = (rowByDirection[direction] / 3) * 100

  const finalAtlases: Record<string, string> = {
    ember_tail: hearthHoundEmberTailWalkAtlas,
    pine_shadow: hearthHoundPineShadowWalkAtlas,
    moon_paw: hearthHoundMoonPawWalkAtlas,
  }
  const atlas = stage >= 2 ? finalAtlases[evolutionPath] || hearthHoundManeWalkAtlas : stage >= 1 ? hearthHoundManeWalkAtlas : hearthHoundWalkAtlas
  const formClass = stage >= 2 ? 'hearth-hound-sprite-final' : stage >= 1 ? 'hearth-hound-sprite-grown' : ''
  return <span className={`hearth-hound-sprite hearth-hound-sprite-${size} ${formClass}`} aria-hidden='true'>
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
