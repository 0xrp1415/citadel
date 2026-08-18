export type PlayerStatus = 'joined' | 'connected' | 'ready' | 'disconnected' | 'left' | 'in-run'

export interface Stats {
  hp: number
  strength: number
  dexterity: number
  intelligence: number
  wisdom: number
  agility: number
}

export type GearSlot = 'head' | 'chest' | 'greaves'

export interface ArmorPiece {
  armorId: string
  armorName: string
  description: string
  stats: Stats
  gear_position: GearSlot
}

export interface ArmorSlots {
  head: ArmorPiece
  chest: ArmorPiece
  greaves: ArmorPiece
}

export interface WeaponPiece {
  weaponId: string
  weaponName: string
  description: string
  stats: Stats
}

export type ConsumableType = 'health_potion' | 'gold_key' | 'lockpick'
export type Consumables = Record<ConsumableType, number>
export type Race = 'elf' | 'dwarf' | 'human' | 'orc' | 'goblin' | 'troll'

export interface PlayerRunEntity {
  base_stats: Stats
  stat_modifiers: Stats
  armor_stats: ArmorSlots
  weapon_stats: WeaponPiece
  level: number
  experience: number
  skill_points: number
  gold: number
  race: Race
  consumables: Consumables
  health: { MaxHealth: number; CurrentHealth: number }
}

export interface PlayerPublic {
  playerId: string
  name: string
  status: PlayerStatus
  isHost: boolean
  stats: PlayerRunEntity
}

export interface RoomConfig {
  maxPlayers: number
  seed: string
  difficulty: 'easy' | 'medium' | 'hard'
  mapSize: 'small' | 'medium' | 'large'
}

const SEED_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateSeed(length = 6): string {
  const out = new Array<string>(length)
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < length; i++) {
    out[i] = SEED_CHARS[bytes[i] % SEED_CHARS.length]
  }
  return out.join('')
}

export interface RoomPublicJSON {
  type: string
  baseDifficulty: number
  distanceBonus: number
  isCurrentRoom: boolean
  adjacentRooms: {
    left: number | null
    right: number | null
    up: number | null
    down: number | null
  }
}

export interface PassagePublicJSON {
  id: number
  roomA: number
  roomB: number
  direction: 'left' | 'right' | 'up' | 'down' | null
  event: { type: string; requiredStat: string; difficulty: number } | null
  unlocked: boolean
}

export interface MapPublicJSON {
  rooms: RoomPublicJSON[]
  passages: PassagePublicJSON[]
}

export interface RoomData {
  inviteCode: string
  totalPlayers: number
  players: PlayerPublic[]
  config: RoomConfig
  status: string
  floor: number
  currentRoom: { type: string; index: number }
  map: MapPublicJSON | null
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

export async function sendAction(roomToken: string, action: string, payload?: unknown): Promise<void> {
  await request<unknown>('/api/rooms/action', roomToken, {
    method: 'POST',
    body: JSON.stringify({ action, payload }),
  })
}

export async function setPlayerRace(roomToken: string, race: Race): Promise<void> {
  await sendAction(roomToken, 'SET_PLAYER_RACE', race)
}

export async function changePlayerStatsBy(
  roomToken: string,
  stat: keyof Stats,
  amount: number,
): Promise<void> {
  await sendAction(roomToken, 'CHANGE_PLAYER_STATS', { stat, amount })
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
