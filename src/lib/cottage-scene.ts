export const COTTAGE_SCENE_WIDTH = 320
export const COTTAGE_SCENE_HEIGHT = 180
export const COTTAGE_PLAYER_WIDTH = 32
export const COTTAGE_PLAYER_HEIGHT = 48
export const COTTAGE_COMPANION_POSITION: CottagePosition = { x: 140, y: 78 }

export type CottagePosition = { x: number; y: number }
export type CottageDirection = 'north' | 'south' | 'east' | 'west'
export type CottageInteractionAction = 'expedition' | 'journal' | 'inventory' | 'review' | 'map'
export type CottageInteraction = {
  action: CottageInteractionAction
  label: string
  prompt: CottagePosition
  zone: { left: number; right: number; top: number; bottom: number }
}

const INTERACTIONS: CottageInteraction[] = [
  { action: 'journal', label: '翻开冒险日志', prompt: { x: 58, y: 91 }, zone: { left: 20, right: 115, top: 145, bottom: 178 } },
  { action: 'inventory', label: '打开宝箱与背包', prompt: { x: 184, y: 40 }, zone: { left: 158, right: 218, top: 72, bottom: 108 } },
  { action: 'review', label: '在床边休息与回顾', prompt: { x: 260, y: 78 }, zone: { left: 190, right: 238, top: 105, bottom: 164 } },
  { action: 'map', label: '查看窗边的远征地图', prompt: { x: 136, y: 35 }, zone: { left: 105, right: 156, top: 72, bottom: 108 } },
  { action: 'expedition', label: '穿过门口开始远征', prompt: { x: 160, y: 153 }, zone: { left: 134, right: 186, top: 158, bottom: 183 } },
]

const STEP = 4
const MOVES: Record<string, { dx: number; dy: number; direction: CottageDirection }> = {
  arrowup: { dx: 0, dy: -STEP, direction: 'north' },
  w: { dx: 0, dy: -STEP, direction: 'north' },
  arrowdown: { dx: 0, dy: STEP, direction: 'south' },
  s: { dx: 0, dy: STEP, direction: 'south' },
  arrowleft: { dx: -STEP, dy: 0, direction: 'west' },
  a: { dx: -STEP, dy: 0, direction: 'west' },
  arrowright: { dx: STEP, dy: 0, direction: 'east' },
  d: { dx: STEP, dy: 0, direction: 'east' },
}

const FURNITURE = [
  { left: 12, right: 96, top: 82, bottom: 148, name: '书桌' },
  { left: 224, right: 304, top: 58, bottom: 150, name: '床铺' },
  { left: 20, right: 103, top: 24, bottom: 77, name: '壁炉' },
  { left: 158, right: 211, top: 30, bottom: 73, name: '宝箱' },
  { left: 8, right: 43, top: 128, bottom: 170, name: '盆栽' },
  { left: 241, right: 307, top: 132, bottom: 171, name: '床尾长凳' },
]

export function isNearCottageCompanion(position: CottagePosition, companion = COTTAGE_COMPANION_POSITION) {
  const playerCenterX = position.x + COTTAGE_PLAYER_WIDTH / 2
  const playerFootY = position.y + COTTAGE_PLAYER_HEIGHT - 3
  const companionCenterX = companion.x + 16
  const companionFootY = companion.y + 29
  return Math.abs(playerCenterX - companionCenterX) <= 43 && Math.abs(playerFootY - companionFootY) <= 30
}

export function getCottageInteraction(position: CottagePosition) {
  const playerCenterX = position.x + COTTAGE_PLAYER_WIDTH / 2
  const playerFootY = position.y + COTTAGE_PLAYER_HEIGHT - 3
  return INTERACTIONS.find(({ zone }) => playerCenterX >= zone.left
    && playerCenterX <= zone.right
    && playerFootY >= zone.top
    && playerFootY <= zone.bottom) || null
}

function overlapsCompanion(position: CottagePosition, companion: CottagePosition) {
  const playerBody = { left: position.x + 8, right: position.x + 24, top: position.y + 25, bottom: position.y + 47 }
  const companionBody = { left: companion.x + 5, right: companion.x + 27, top: companion.y + 7, bottom: companion.y + 31 }
  return playerBody.left < companionBody.right
    && playerBody.right > companionBody.left
    && playerBody.top < companionBody.bottom
    && playerBody.bottom > companionBody.top
}

export function resolveCottageMove(current: CottagePosition, key: string, companion = COTTAGE_COMPANION_POSITION) {
  const movement = MOVES[key.toLowerCase()]
  if (!movement) return null

  const nextX = Math.max(4, Math.min(COTTAGE_SCENE_WIDTH - COTTAGE_PLAYER_WIDTH - 4, current.x + movement.dx))
  const requestedY = current.y + movement.dy
  const playerCenter = nextX + COTTAGE_PLAYER_WIDTH / 2
  const playerFoot = Math.max(30, requestedY) + COTTAGE_PLAYER_HEIGHT - 3
  const alignedWithDoor = playerCenter >= 146 && playerCenter <= 174

  if (requestedY > 132) {
    return {
      direction: movement.direction,
      position: { x: nextX, y: 132 },
      message: alignedWithDoor
        ? '门外是安静的雪夜。准备好后，就从这里开始下一次远征。'
        : '这里是小屋的南墙，出口在中央门槛。',
    }
  }

  const obstruction = FURNITURE.find((item) => playerCenter >= item.left
    && playerCenter <= item.right
    && playerFoot >= item.top
    && playerFoot <= item.bottom)
  if (obstruction) {
    return {
      direction: movement.direction,
      position: current,
      message: `${obstruction.name}挡住了路。以后可以在这里查看或使用它。`,
    }
  }

  const nextPosition = { x: nextX, y: Math.max(30, requestedY) }
  if (overlapsCompanion(nextPosition, companion)) {
    return {
      direction: movement.direction,
      position: current,
      message: '伙伴抬头看向你。按 E、空格或回车与它交谈。',
      blockedBy: 'companion' as const,
    }
  }

  return {
    direction: movement.direction,
    position: nextPosition,
    message: '炉火小屋 · 安全区域',
  }
}
