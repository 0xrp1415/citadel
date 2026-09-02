export type PlayerStatus = 'joined' | 'connected' | 'ready' | 'disconnected' | 'left' | 'in-run'

export interface Stats {
  hp: number
  strength: number
  dexterity: number
  intelligence: number
  wisdom: number
  agility: number
}

export type GearSlot = 'head' | 'chest' | 'greaves' | 'weapon'

export type RarityName = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export interface Rarity {
  name: RarityName
  rarityLevel: number
}

export interface ArmorPiece {
  armorId: string
  armorName: string
  description: string
  stats: Stats
  gear_position: 'head' | 'chest' | 'greaves'
  rarity: Rarity
}

export interface ArmorSlots {
  head: ArmorPiece | null
  chest: ArmorPiece | null
  greaves: ArmorPiece | null
}

export interface WeaponPiece {
  weaponId: string
  weaponName: string
  description: string
  stats: Stats
  rarity: Rarity
}

export type ItemType = 'gear' | 'consumable' | 'scroll'

export interface RunItem {
  id: string
  name: string
  description: string
  type: ItemType
  rarity: Rarity
  stackable: boolean
  buyPrice: number
  slot?: GearSlot
  stats?: Stats
  required_stats?: Stats
  ability?: string
  ability_description?: string
}

export type ConsumableType = 'health_potion' | 'gold_key' | 'lockpick'
export type Consumables = Record<ConsumableType, number>

export type Ability = {
  id: string
  name: string
  active: boolean
  flavor_text: string
  description: string
  targeting: { kind: 'enemy' | 'ally' | 'self' | 'any'; scope: 'single' | 'all' | 'self' }
  minimumLevel: number
  minimumStats: Partial<Stats>
}

export interface PlayerRunEntity {
  base_stats: Stats
  stat_modifiers: Stats
  armor_stats: ArmorSlots
  weapon_stats: WeaponPiece | null
  level: number
  experience: number
  skill_points: number
  gold: number
  consumables: Consumables
  items: RunItem[]
  health: { MaxHealth: number; CurrentHealth: number }
  abilities: Ability[]
  activeAbilities: { slot: number; id: string }[]
}

export interface PlayerPublic {
  playerId: string
  playerPublicId: string
  name: string
  status: PlayerStatus
  disconnectedAt: number | null
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

export interface ExitPublicJSON {
  targetRoomId: number
  event: { type: string; requiredStat: string; difficulty: number } | null
  unlocked: boolean
}

export interface RoomPublicJSON {
  type: string
  baseDifficulty: number
  distanceBonus: number
  isCurrentRoom: boolean
  isVisited: boolean
  exits: {
    north: ExitPublicJSON | null
    south: ExitPublicJSON | null
    east: ExitPublicJSON | null
    west: ExitPublicJSON | null
  }
}

export interface MapPublicJSON {
  rooms: RoomPublicJSON[]
  startRoomIndex: number
}

export interface RoomMessage {
  from: string
  message: string
}

export interface MessageUpdatePayload {
  resolverBusy: boolean
  messages: RoomMessage[]
}

export type ConfirmationType = 'unanimous' | 'majority'

export interface ConfirmationUpdatePayload {
  type: ConfirmationType
  votes: Record<string, boolean>
  deadlineAt: number
  durationMs: number
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
  message?: RoomMessage[]
  dungeonMasterState?: 'idle' | 'active'
  hostPublicId: string | null
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

export async function changePlayerStatsBy(
  roomToken: string,
  stat: keyof Stats,
  amount: number,
): Promise<void> {
  await sendAction(roomToken, 'change_player_stats', { stat, amount })
}

export async function equipItem(roomToken: string, index: number): Promise<void> {
  await sendAction(roomToken, 'equip_item', { index })
}

export async function useInventoryItem(roomToken: string, id: string): Promise<void> {
  await sendAction(roomToken, 'use_inventory_item', { id })
}

export async function unequipItem(roomToken: string, slot: GearSlot): Promise<void> {
  await sendAction(roomToken, 'unequip_item', { slot })
}

export async function setActiveAbility(
  roomToken: string,
  id: string,
  slot: number,
): Promise<void> {
  await sendAction(roomToken, 'set_active_ability', { id, slot })
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
