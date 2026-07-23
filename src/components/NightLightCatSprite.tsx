import glimmerCatWalkAtlas from '../../assets/art/characters/companions/glimmer_cat_stage-0_walk_32_v1.png'
import glimmerCatGrownWalkAtlas from '../../assets/art/characters/companions/glimmer_cat_stage-1_walk_32_v1.png'
import glimmerCatNightGlassWalkAtlas from '../../assets/art/characters/companions/glimmer_cat_night_glass_walk_32_v1.png'
import '../night-light-cat-sprite.css'

type Direction = 'front' | 'back' | 'left' | 'right'
type SpriteSize = 'small' | 'medium' | 'large' | 'scene'

const rowByDirection: Record<Direction, number> = { front: 0, back: 1, left: 2, right: 3 }

/** Production renderer for 灯团 / 星烛 / 夜璃. Uses the same fixed 4×4
 * atlas contract as every companion, while stage decides which real art appears. */
export function NightLightCatSprite({
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
  const atlas = stage >= 2 && evolutionPath === 'night_glass'
    ? glimmerCatNightGlassWalkAtlas
    : stage >= 1 ? glimmerCatGrownWalkAtlas : glimmerCatWalkAtlas
  const formClass = stage >= 2 ? 'night-light-cat-sprite-final' : stage >= 1 ? 'night-light-cat-sprite-grown' : ''
  return <span className={`night-light-cat-sprite night-light-cat-sprite-${size} ${formClass}`} aria-hidden='true'>
    <span className='night-light-cat-sprite-frame' style={{
      backgroundImage: `url(${atlas})`,
      backgroundPosition: `${frame / 3 * 100}% ${rowByDirection[direction] / 3 * 100}%`,
    }} />
    {sleeping && <em className='night-light-cat-sleep-pixels'>z</em>}
  </span>
}
