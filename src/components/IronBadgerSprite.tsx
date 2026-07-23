import ironBadgerWalkAtlas from '../../assets/art/characters/companions/iron_badger_stage-0_walk_32_v1.png'
import ironBadgerGrownWalkAtlas from '../../assets/art/characters/companions/iron_badger_stage-1_walk_32_v1.png'
import ironBadgerArmorKingWalkAtlas from '../../assets/art/characters/companions/iron_badger_armor_king_walk_32_v1.png'
import '../iron-badger-sprite.css'

type Direction = 'front' | 'back' | 'left' | 'right'
type SpriteSize = 'small' | 'medium' | 'large' | 'scene'

const rowByDirection: Record<Direction, number> = { front: 0, back: 1, left: 2, right: 3 }

/** Production renderer for 小石獾 / 岩甲獾 / 铠獾王. Form art changes with
 * shared growth chapters only; the companion grants no mechanical advantage. */
export function IronBadgerSprite({
  direction = 'front', frame = 0, size = 'large', sleeping = false, stage = 0, evolutionPath = '',
}: {
  direction?: Direction
  frame?: 0 | 1 | 2 | 3
  size?: SpriteSize
  sleeping?: boolean
  stage?: number
  evolutionPath?: string
}) {
  const atlas = stage >= 2 && evolutionPath === 'armor_king'
    ? ironBadgerArmorKingWalkAtlas
    : stage >= 1 ? ironBadgerGrownWalkAtlas : ironBadgerWalkAtlas
  const formClass = stage >= 2 ? 'iron-badger-sprite-final' : stage >= 1 ? 'iron-badger-sprite-grown' : ''
  return <span className={`iron-badger-sprite iron-badger-sprite-${size} ${formClass}`} aria-hidden='true'>
    <span className='iron-badger-sprite-frame' style={{
      backgroundImage: `url(${atlas})`,
      backgroundPosition: `${frame / 3 * 100}% ${rowByDirection[direction] / 3 * 100}%`,
    }} />
    {sleeping && <em className='iron-badger-sleep-pixels'>z</em>}
  </span>
}
