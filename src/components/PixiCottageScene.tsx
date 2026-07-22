import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import 'pixi.js/unsafe-eval'
import type { Application, Graphics, Sprite, Texture } from 'pixi.js'
import type { Companion } from '../types'
import { canHandle } from '../lib/inputContext'
import roomBackdrop from '../../assets/art/environments/cottage/cottage_room_backdrop_provisional_v1.png'
import playerWalkAtlas from '../../assets/art/characters/player/player_walk_32x48_v1.png'
import hearthHoundWalkAtlas from '../../assets/art/characters/companions/hearth_hound_walk_32_v1.png'
import hearthHoundManeWalkAtlas from '../../assets/art/characters/companions/hearth_hound_stage-1_walk_32_v1.png'
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
import '../pixi-cottage-scene.css'
import '../cottage-scene.css'

export function PixiCottageScene({
  playerName,
  companion = null,
  immersive = false,
  onAction,
  onCompanionInteract,
  onInitError,
}: {
  playerName: string
  companion?: Companion | null
  immersive?: boolean
  onAction?: (action: CottageInteractionAction) => void
  onCompanionInteract?: () => void
  onInitError?: () => void
}) {
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const playerSpriteRef = useRef<Sprite | null>(null)
  const companionSpriteRef = useRef<Sprite | Graphics | null>(null)
  const houndSpriteRef = useRef<Sprite | null>(null)
  const playerFramesRef = useRef<Record<CottageDirection, Texture[]> | null>(null)
  const houndFramesRef = useRef<Record<CottageDirection, Texture> | null>(null)
  const [position, setPosition] = useState<CottagePosition>({ x: 105, y: 78 })
  const [direction, setDirection] = useState<CottageDirection>('south')
  const [walkFrame, setWalkFrame] = useState(0)
  const [pressedMoveKey, setPressedMoveKey] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [message, setMessage] = useState('使用方向键或 WASD 移动；靠近物件后按 E、空格或回车。')

  useEffect(() => {
    let disposed = false
    let initialized = false
    let app: Application | null = null

    const start = async () => {
      try {
        // Dynamic import isolates renderer capability failures in Electron.
        // The caller can then safely render the pre-existing DOM cottage fallback.
        const { Application, Graphics, Rectangle, Sprite, Texture } = await import('pixi.js')
        app = new Application()
        await app.init({
          width: COTTAGE_SCENE_WIDTH,
          height: COTTAGE_SCENE_HEIGHT,
          antialias: false,
          autoDensity: false,
          backgroundAlpha: 0,
          resolution: 1,
          preference: 'webgl',
        })
        initialized = true
        if (disposed || !canvasHostRef.current) {
          app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false })
          return
        }

        app.stage.sortableChildren = true
        appRef.current = app
        app.canvas.classList.add('pixi-cottage-canvas')
        canvasHostRef.current.appendChild(app.canvas)

        const loadTexture = async (url: string) => {
          const image = new Image()
          image.src = url
          await image.decode()
          return Texture.from(image)
        }
        const [backdropTexture, playerAtlas, houndAtlas] = await Promise.all([
          loadTexture(roomBackdrop),
          loadTexture(playerWalkAtlas),
          loadTexture(companion?.stage && companion.stage >= 1 ? hearthHoundManeWalkAtlas : hearthHoundWalkAtlas),
        ])
        if (disposed) return

        const backdrop = new Sprite(backdropTexture)
        backdrop.width = COTTAGE_SCENE_WIDTH
        backdrop.height = COTTAGE_SCENE_HEIGHT
        backdrop.zIndex = 1

        const rowByDirection: Record<CottageDirection, number> = { south: 0, north: 1, west: 2, east: 3 }
        const playerFrames = Object.fromEntries(Object.entries(rowByDirection).map(([facing, row]) => [
          facing,
          Array.from({ length: 4 }, (_, frame) => new Texture({ source: playerAtlas.source, frame: new Rectangle(frame * 32, row * 48, 32, 48) })),
        ])) as Record<CottageDirection, Texture[]>
        playerFramesRef.current = playerFrames
        const player = new Sprite(playerFrames.south[0])
        player.width = COTTAGE_PLAYER_WIDTH
        player.height = COTTAGE_PLAYER_HEIGHT
        player.zIndex = 200
        playerSpriteRef.current = player

        let sceneCompanion: Sprite | Graphics
        if (!companion || companion.species_id === 'hearth_hound') {
          const houndFrames = {
            south: new Texture({ source: houndAtlas.source, frame: new Rectangle(0, 0, 32, 32) }),
            north: new Texture({ source: houndAtlas.source, frame: new Rectangle(0, 32, 32, 32) }),
            west: new Texture({ source: houndAtlas.source, frame: new Rectangle(0, 64, 32, 32) }),
            east: new Texture({ source: houndAtlas.source, frame: new Rectangle(0, 96, 32, 32) }),
          }
          houndFramesRef.current = houndFrames
          sceneCompanion = new Sprite(houndFrames.south)
          houndSpriteRef.current = sceneCompanion
        } else {
          const palette = companion.species.palette === 'ember' ? 0xa84c32 : companion.species.palette === 'moon' ? 0xaaa6a0 : 0x7d8150
          sceneCompanion = new Graphics().roundRect(5, 7, 22, 20, 3).fill({ color: palette }).rect(8, 4, 16, 5).fill({ color: palette })
        }
          const houndSize = companion?.species_id === 'hearth_hound' && companion.stage >= 1 ? 40 : 32
          sceneCompanion.width = houndSize
          sceneCompanion.height = houndSize
          sceneCompanion.position.set(COTTAGE_COMPANION_POSITION.x + (32 - houndSize) / 2, COTTAGE_COMPANION_POSITION.y + 32 - houndSize)
        sceneCompanion.zIndex = 180 + COTTAGE_COMPANION_POSITION.y + 32
        companionSpriteRef.current = sceneCompanion

        app.stage.addChild(backdrop, sceneCompanion, player)
        player.position.set(position.x, position.y)
        player.zIndex = 200 + position.y + COTTAGE_PLAYER_HEIGHT
        app.render()
      } catch (error) {
        if (!disposed) {
          const detail = error instanceof Error ? error.message : String(error)
          console.error('[PixiCottageScene] initialization failed', error)
          setInitError(detail)
          onInitError?.()
        }
      }
    }

    void start()
    return () => {
      disposed = true
      playerSpriteRef.current = null
      appRef.current = null
      playerFramesRef.current = null
      companionSpriteRef.current = null
      houndSpriteRef.current = null
      houndFramesRef.current = null
      // React development mode intentionally mounts, cleans up, then mounts
      // effects again. Pixi v8 must not be destroyed before async init finishes.
      if (initialized && app) {
        app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false })
      }
    }
    }, [companion?.species_id, companion?.stage, onInitError])

  useEffect(() => {
    const player = playerSpriteRef.current
    const sceneCompanion = companionSpriteRef.current
    if (!player || !sceneCompanion) return
    player.position.set(position.x, position.y)
    player.zIndex = 200 + position.y + COTTAGE_PLAYER_HEIGHT
    if (playerFramesRef.current) player.texture = playerFramesRef.current[direction][walkFrame]
      const houndSize = companion?.species_id === 'hearth_hound' && companion.stage >= 1 ? 40 : 32
      sceneCompanion.position.set(COTTAGE_COMPANION_POSITION.x + (32 - houndSize) / 2, COTTAGE_COMPANION_POSITION.y + 32 - houndSize)
    sceneCompanion.zIndex = 180 + COTTAGE_COMPANION_POSITION.y + 32
    if (houndSpriteRef.current && houndFramesRef.current) {
      const deltaX = position.x - COTTAGE_COMPANION_POSITION.x
      const deltaY = position.y - COTTAGE_COMPANION_POSITION.y
      const companionFacing: CottageDirection = Math.abs(deltaX) > Math.abs(deltaY)
        ? (deltaX < 0 ? 'west' : 'east')
        : (deltaY < 0 ? 'north' : 'south')
      houndSpriteRef.current.texture = houndFramesRef.current[companionFacing]
    }
    appRef.current?.render()
  }, [direction, position, walkFrame])

  useEffect(() => { sceneRef.current?.focus() }, [])

  const talkToCompanion = () => {
    setMessage(`${companion?.nickname || '伙伴'}抬头回应了你。`)
    onCompanionInteract?.()
  }

  const applyMove = (key: string) => {
    const result = resolveCottageMove(position, key)
    if (!result) return false
    setDirection(result.direction)
    setPosition(result.position)
    setWalkFrame((frame) => (frame + 1) % 4)
    const blockedByCompanion = 'blockedBy' in result && result.blockedBy === 'companion'
    const nearbyInteraction = getCottageInteraction(result.position)
    setMessage(blockedByCompanion
      ? `${companion?.nickname || '伙伴'}抬头看向你。按 E、空格或回车交谈。`
      : nearbyInteraction
        ? `按 E、空格或回车：${nearbyInteraction.label}`
        : result.message)
    return true
  }

  useEffect(() => {
    if (!pressedMoveKey) return
    const timer = window.setInterval(() => { applyMove(pressedMoveKey) }, 85)
    return () => window.clearInterval(timer)
  }, [position, pressedMoveKey])

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!canHandle('world')) return
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

    const key = event.key.toLowerCase()
    if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) return
    event.preventDefault()
    if (!pressedMoveKey) applyMove(key)
    setPressedMoveKey(key)
  }

  const stopMove = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key.toLowerCase() === pressedMoveKey) setPressedMoveKey(null)
  }

  const nearbyInteraction = getCottageInteraction(position)
  const interactionPrompt = isNearCottageCompanion(position)
    ? { label: `与${companion?.nickname || '伙伴'}交谈`, position: { x: COTTAGE_COMPANION_POSITION.x + 16, y: COTTAGE_COMPANION_POSITION.y - 3 } }
    : nearbyInteraction
      ? { label: nearbyInteraction.label, position: nearbyInteraction.prompt }
      : null
  const promptStyle: CSSProperties | undefined = interactionPrompt ? {
    left: `${interactionPrompt.position.x / COTTAGE_SCENE_WIDTH * 100}%`,
    top: `${interactionPrompt.position.y / COTTAGE_SCENE_HEIGHT * 100}%`,
  } : undefined

  return <div className={`cottage-scene-shell ${immersive ? 'is-immersive' : ''} pixi-cottage-scene-shell`}>
    <div
      ref={sceneRef}
      className={`cottage-scene pixi-cottage-scene facing-${direction}`}
      tabIndex={0}
      role='application'
      aria-label='可行走的炉火小屋。使用方向键或 WASD 移动，按 E、空格或回车交互。'
      onKeyDown={move}
      onKeyUp={stopMove}
      onBlur={() => setPressedMoveKey(null)}
      onPointerDown={() => sceneRef.current?.focus()}
    >
      <div className='pixi-cottage-canvas-host' ref={canvasHostRef} aria-hidden='true' />
      {initError && <div className='pixi-cottage-error' role='alert'>
        Pixi 小屋资源未能加载：{initError}
      </div>}
      {interactionPrompt && <div className='cottage-interaction-prompt' style={promptStyle} aria-hidden='true'>
        <kbd>E</kbd><span>{interactionPrompt.label}</span>
      </div>}
    </div>
    <div className='cottage-scene-status' aria-live='polite'><span />{message}</div>
  </div>
}
