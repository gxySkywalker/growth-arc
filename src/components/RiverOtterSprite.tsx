import riverOtterWalkAtlas from '../../assets/art/characters/companions/river_otter_stage-0_walk_32_v1.png'
import riverOtterGrownWalkAtlas from '../../assets/art/characters/companions/river_otter_stage-1_walk_32_v1.png'
import riverOtterBayCurrentWalkAtlas from '../../assets/art/characters/companions/river_otter_bay_current_walk_32_v1.png'
import '../river-otter-sprite.css'

type Direction = 'front' | 'back' | 'left' | 'right'
type SpriteSize = 'small' | 'medium' | 'large' | 'scene'

const rowByDirection: Record<Direction, number> = { front: 0, back: 1, left: 2, right: 3 }

/** Production renderer for 涟牙 / 漪爪 / 湾澜. All three use the universal
 * 4×4 movement atlas contract; growth selects art, never a stat advantage. */
export function RiverOtterSprite({
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
  const atlas = stage >= 2 && evolutionPath === 'bay_current'
    ? riverOtterBayCurrentWalkAtlas
    : stage >= 1 ? riverOtterGrownWalkAtlas : riverOtterWalkAtlas
  const formClass = stage >= 2 ? 'river-otter-sprite-final' : stage >= 1 ? 'river-otter-sprite-grown' : ''
  return <span className={`river-otter-sprite river-otter-sprite-${size} ${formClass}`} aria-hidden='true'>
    <span className='river-otter-sprite-frame' style={{
      backgroundImage: `url(${atlas})`,
      backgroundPosition: `${frame / 3 * 100}% ${rowByDirection[direction] / 3 * 100}%`,
    }} />
    {sleeping && <em className='river-otter-sleep-pixels'>z</em>}
  </span>
}
