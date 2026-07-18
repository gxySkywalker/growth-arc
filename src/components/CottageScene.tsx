import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import type { Companion } from '../types'
import '../cottage-scene.css'
import roomBackdrop from '../../assets/art/environments/cottage/cottage_room_backdrop_provisional_v1.png'
import playerSprite from '../../assets/art/characters/player/player_idle_front_provisional_v1.png'
import {
  COTTAGE_PLAYER_HEIGHT,
  COTTAGE_PLAYER_WIDTH,
  COTTAGE_COMPANION_POSITION,
  COTTAGE_SCENE_HEIGHT,
  COTTAGE_SCENE_WIDTH,
  getCottageInteraction,
  isNearCottageCompanion,
  resolveCottageMove,
  type CottageInteractionAction,
  type CottageDirection,
  type CottagePosition,
} from '../lib/cottage-scene'
import { SceneCompanion } from './SceneCompanion'

export type CottageAction = CottageInteractionAction

export function CottageScene({
  playerName,
  companion = null,
  immersive = false,
  onAction,
  onCompanionInteract,
}: {
  playerName: string
  companion?: Companion | null
  immersive?: boolean
  onAction?: (action: CottageAction) => void
  onCompanionInteract?: () => void
}) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<CottagePosition>({ x: 105, y: 78 })
  const [direction, setDirection] = useState<CottageDirection>('south')
  const [message, setMessage] = useState('使用方向键或 WASD 移动；靠近物件后按 E、空格或回车。')
  const [companionAttention, setCompanionAttention] = useState(false)

  useEffect(() => { sceneRef.current?.focus() }, [])

  const talkToCompanion = () => {
    setCompanionAttention(true)
    setMessage(`${companion?.nickname || '伙伴'}抬头回应了你。`)
    onCompanionInteract?.()
  }

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    if (['e', 'enter', ' '].includes(event.key.toLowerCase())) {
      event.preventDefault()
      if (isNearCottageCompanion(position)) {
        talkToCompanion()
        return
      }
      const interaction = getCottageInteraction(position)
      if (interaction && onAction) {
        setMessage(interaction.label)
        onAction(interaction.action)
      } else setMessage('这里没有需要操作的东西。再靠近一些看看。')
      return
    }
    const result = resolveCottageMove(position, event.key)
    if (!result) return
    event.preventDefault()
    setDirection(result.direction)
    setPosition(result.position)
    const blockedByCompanion = 'blockedBy' in result && result.blockedBy === 'companion'
    setCompanionAttention(blockedByCompanion || isNearCottageCompanion(result.position))
    const nearbyInteraction = getCottageInteraction(result.position)
    setMessage(blockedByCompanion
      ? `${companion?.nickname || '伙伴'}抬头看向你。按 E、空格或回车交谈。`
      : nearbyInteraction
        ? `按 E、空格或回车：${nearbyInteraction.label}`
        : result.message)
  }

  const playerStyle: CSSProperties = {
    left: `${position.x / COTTAGE_SCENE_WIDTH * 100}%`,
    top: `${position.y / COTTAGE_SCENE_HEIGHT * 100}%`,
    width: `${COTTAGE_PLAYER_WIDTH / COTTAGE_SCENE_WIDTH * 100}%`,
    height: `${COTTAGE_PLAYER_HEIGHT / COTTAGE_SCENE_HEIGHT * 100}%`,
    backgroundImage: `url(${playerSprite})`,
    zIndex: 100 + position.y + COTTAGE_PLAYER_HEIGHT,
  }
  const nearbyInteraction = getCottageInteraction(position)
  const interactionPrompt = isNearCottageCompanion(position)
    ? {
        label: `与${companion?.nickname || '伙伴'}交谈`,
        position: { x: COTTAGE_COMPANION_POSITION.x + 16, y: COTTAGE_COMPANION_POSITION.y - 3 },
      }
    : nearbyInteraction
      ? { label: nearbyInteraction.label, position: nearbyInteraction.prompt }
      : null
  const promptStyle: CSSProperties | undefined = interactionPrompt ? {
    left: `${interactionPrompt.position.x / COTTAGE_SCENE_WIDTH * 100}%`,
    top: `${interactionPrompt.position.y / COTTAGE_SCENE_HEIGHT * 100}%`,
  } : undefined

  return <div className={`cottage-scene-shell ${immersive ? 'is-immersive' : ''}`}>
    <div
      ref={sceneRef}
      className='cottage-scene'
      tabIndex={0}
      role='application'
      aria-label='可行走的炉火小屋。使用方向键或 WASD 移动，按 E、空格或回车交互。'
      onKeyDown={move}
      onPointerDown={() => sceneRef.current?.focus()}
    >
      <img className='cottage-room-backdrop' src={roomBackdrop} alt='' draggable={false} />
      <i className='cottage-firelight' aria-hidden='true' />
      <i className='cottage-vignette' aria-hidden='true' />
      <SceneCompanion
        companion={companion}
        attentive={companionAttention}
        facing={position.x < COTTAGE_COMPANION_POSITION.x ? 'left' : 'right'}
        depth={100 + COTTAGE_COMPANION_POSITION.y + 32}
      />
      <div className={`cottage-player facing-${direction}`} style={playerStyle} role='img' aria-label={`${playerName}，站在小屋中`} />
      {interactionPrompt && <div className='cottage-interaction-prompt' style={promptStyle} aria-hidden='true'>
        <kbd>E</kbd><span>{interactionPrompt.label}</span>
      </div>}
    </div>
    <div className='cottage-scene-status' aria-live='polite'><span />{message}</div>
  </div>
}
