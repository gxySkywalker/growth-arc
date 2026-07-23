import mossFoxWalkAtlas from '../../assets/art/characters/companions/moss_fox_stage-0_walk_32_v1.png'
import mossFoxGrownWalkAtlas from '../../assets/art/characters/companions/moss_fox_stage-1_walk_32_v1.png'
import mossFoxForestCrownWalkAtlas from '../../assets/art/characters/companions/moss_fox_forest_crown_walk_32_v1.png'
import '../moss-fox-sprite.css'

type Direction = 'front' | 'back' | 'left' | 'right'
type SpriteSize = 'small' | 'medium' | 'large' | 'scene'

const rowByDirection: Record<Direction, number> = { front: 0, back: 1, left: 2, right: 3 }

/** Production renderer for 枝绒 / 苔亚 / 森冠. The atlas is a fixed 4×4
 * grid, so every display surface shares the same art and frame contract. */
export function MossFoxSprite({
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
  const atlas = stage >= 2 && evolutionPath === 'forest_crown'
    ? mossFoxForestCrownWalkAtlas
    : stage >= 1 ? mossFoxGrownWalkAtlas : mossFoxWalkAtlas
  const formClass = stage >= 2 ? 'moss-fox-sprite-final' : stage >= 1 ? 'moss-fox-sprite-grown' : ''
  return <span className={`moss-fox-sprite moss-fox-sprite-${size} ${formClass}`} aria-hidden='true'>
    <span className='moss-fox-sprite-frame' style={{
      backgroundImage: `url(${atlas})`,
      backgroundPosition: `${frame / 3 * 100}% ${rowByDirection[direction] / 3 * 100}%`,
    }} />
    {sleeping && <em className='moss-fox-sleep-pixels'>z</em>}
  </span>
}
