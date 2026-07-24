import moonOwlWalkAtlas from '../../assets/art/characters/companions/moon_owl_stage-0_walk_32_v1.png'
import moonOwlGrownWalkAtlas from '../../assets/art/characters/companions/moon_owl_stage-1_walk_32_v1.png'
import moonOwlFinalWalkAtlas from '../../assets/art/characters/companions/moon_owl_dusk_owl_walk_32_v1.png'
import '../dusk-owl-sprite.css'

type Direction = 'front' | 'back' | 'left' | 'right'
type SpriteSize = 'small' | 'medium' | 'large' | 'scene'

const rowByDirection: Record<Direction, number> = { front: 0, back: 1, left: 2, right: 3 }

/** Production renderer for 暮羽子 / 咕夜枭 / 冥翔鹰鸮. Growth changes the
 * visual memory of companionship and never provides a mechanical advantage. */
export function DuskOwlSprite({
  direction = 'front', frame = 0, size = 'large', sleeping = false, stage = 0, evolutionPath = '',
}: {
  direction?: Direction
  frame?: 0 | 1 | 2 | 3
  size?: SpriteSize
  sleeping?: boolean
  stage?: number
  evolutionPath?: string
}) {
  const atlas = stage >= 2 && evolutionPath === 'dusk_owl'
    ? moonOwlFinalWalkAtlas
    : stage >= 1 ? moonOwlGrownWalkAtlas : moonOwlWalkAtlas
  const formClass = stage >= 2 ? 'dusk-owl-sprite-final' : stage >= 1 ? 'dusk-owl-sprite-grown' : ''
  return <span className={`dusk-owl-sprite dusk-owl-sprite-${size} ${formClass}`} aria-hidden='true'>
    <span className='dusk-owl-sprite-frame' style={{
      backgroundImage: `url(${atlas})`,
      backgroundPosition: `${frame / 3 * 100}% ${rowByDirection[direction] / 3 * 100}%`,
    }} />
    {sleeping && <em className='dusk-owl-sleep-pixels'>z</em>}
  </span>
}
