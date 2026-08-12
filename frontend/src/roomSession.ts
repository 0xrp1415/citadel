const ROOM_TOKEN_KEY = 'citadel.roomToken'
const INVITE_CODE_KEY = 'citadel.inviteCode'

export interface DecodedRoomToken {
  roomId: string
  userId: string
  playerId: string
}

export function decodeRoomToken(token: string): DecodedRoomToken | null {
  const payload = token.split('.')[0]
  if (!payload) return null
  try {
    const raw = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const [roomId, userId, playerId] = raw.split('@')
    if (!roomId || !userId || !playerId) return null
    return { roomId, userId, playerId }
  } catch {
    return null
  }
}

export function saveRoomSession(token: string, inviteCode: string): void {
  localStorage.setItem(ROOM_TOKEN_KEY, token)
  localStorage.setItem(INVITE_CODE_KEY, inviteCode)
}

export function getRoomToken(): string | null {
  return localStorage.getItem(ROOM_TOKEN_KEY)
}

export function getInviteCode(): string | null {
  return localStorage.getItem(INVITE_CODE_KEY)
}

export function clearRoomSession(): void {
  localStorage.removeItem(ROOM_TOKEN_KEY)
  localStorage.removeItem(INVITE_CODE_KEY)
}
