export type PlayerStatus = 'joined' | 'connected' | 'ready' | 'disconnected' | 'left' | 'in-run'

export interface PlayerPublic {
  playerId: string
  name: string
  status: PlayerStatus
  isHost: boolean
}

export interface RoomConfig {
  maxPlayers: number
}

export interface RoomData {
  inviteCode: string
  totalPlayers: number
  players: PlayerPublic[]
  config: RoomConfig
  status: string
}

export interface CreateRoomResult {
  inviteCode: string
  hash: string
  room: RoomData
}

export interface JoinRoomResult {
  hash: string
  room: RoomData
}

async function request<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(path, { ...init, headers })
  if (!res.ok) {
    let message = `Request failed: ${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // keep default message
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export async function createRoom(
  config: RoomConfig,
  name: string,
  userToken: string,
): Promise<CreateRoomResult> {
  return request<CreateRoomResult>('/api/rooms/create', userToken, {
    method: 'POST',
    body: JSON.stringify({ config, name }),
  })
}

export async function joinRoom(
  inviteCode: string,
  name: string,
  userToken: string,
): Promise<JoinRoomResult> {
  return request<JoinRoomResult>(`/api/rooms/join/${encodeURIComponent(inviteCode)}`, userToken, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function leaveRoom(roomToken: string): Promise<void> {
  await request<unknown>('/api/rooms/leave', roomToken, { method: 'POST' })
}

export async function toggleReady(roomToken: string): Promise<void> {
  await request<unknown>('/api/rooms/ready', roomToken, { method: 'POST' })
}

export async function startGame(roomToken: string): Promise<void> {
  await request<unknown>('/api/rooms/start', roomToken, { method: 'POST' })
}

export async function confirmStart(roomToken: string): Promise<void> {
  await request<unknown>('/api/rooms/confirm-start', roomToken, { method: 'POST' })
}

export async function kickPlayer(roomToken: string, playerId: string): Promise<void> {
  await request<unknown>('/api/rooms/kick', roomToken, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  })
}

export async function updateRoomConfig(roomToken: string, config: RoomConfig): Promise<void> {
  await request<unknown>('/api/rooms/room', roomToken, {
    method: 'PUT',
    body: JSON.stringify({ config }),
  })
}
