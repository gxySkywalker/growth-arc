import cloudRabbitWalkAtlas from '../../assets/art/characters/companions/cloud_rabbit_stage-0_walk_32_v1.png'
import cloudRabbitGrownWalkAtlas from '../../assets/art/characters/companions/cloud_rabbit_stage-1_walk_32_v1.png'
import cloudRabbitFinalWalkAtlas from '../../assets/art/characters/companions/cloud_rabbit_wind_tuft_rabbit_walk_32_v1.png'
import '../cloud-rabbit-sprite.css'

type Direction = 'front' | 'back' | 'left' | 'right'
type SpriteSize = 'small' | 'medium' | 'large' | 'scene'

const rowByDirection: Record<Direction, number> = { front: 0, back: 1, left: 2, right: 3 }

/** Production renderer for 小丘 / 云丘兔 / 风茸旅兔. */
export function CloudRabbitSprite({
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
  const atlas = stage >= 2 && evolutionPath === 'wind_tuft_rabbit'
    ? cloudRabbitFinalWalkAtlas
    : stage >= 1 ? cloudRabbitGrownWalkAtlas : cloudRabbitWalkAtlas
  const formClass = stage >= 2 ? 'cloud-rabbit-sprite-final' : stage >= 1 ? 'cloud-rabbit-sprite-grown' : ''
  return <span className={`cloud-rabbit-sprite cloud-rabbit-sprite-${size} ${formClass}`} aria-hidden='true'>
    <span className='cloud-rabbit-sprite-frame' style={{
      backgroundImage: `url(${atlas})`,
      backgroundPosition: `${frame / 3 * 100}% ${rowByDirection[direction] / 3 * 100}%`,
    }} />
    {sleeping && <em className='cloud-rabbit-sleep-pixels'>z</em>}
  </span>
}
