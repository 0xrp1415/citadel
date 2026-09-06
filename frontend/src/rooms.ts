export type PlayerStatus = 'joined' | 'connected' | 'ready' | 'disconnected' | 'left' | 'in-run' | 'ended'

export type StarterKitId = 'vanguard' | 'blade' | 'shadow' | 'arcane' | 'wanderer'

export interface StarterKit {
  id: StarterKitId
  name: string
  description: string
  icon: string
  gear: { weapon?: string; head?: string; chest?: string; greaves?: string }
  consumables: { id: string; qty: number }[]
  abilities: string[]
}

export const STARTER_KITS: StarterKit[] = [
  {
    id: 'vanguard', name: 'Vanguard', icon: 'game-icons:shield',
    description: 'Heavy armor and blade. A frontline fighter built to endure.',
    gear: { weapon: 'iron_sword', head: 'iron_helm', chest: 'iron_chestplate', greaves: 'iron_greaves' },
    consumables: [{ id: 'health_potion', qty: 2 }, { id: 'lockpick', qty: 1 }],
    abilities: ['iron_thews', 'mend_wounds'],
  },
  {
    id: 'blade', name: 'Blade', icon: 'game-icons:gauntlet',
    description: 'Swift steel and keen eyes. Strikes fast, strikes first.',
    gear: { weapon: 'rusty_dagger', head: 'night_veil', chest: 'hunter_tunic', greaves: 'reed_sandals' },
    consumables: [{ id: 'health_potion', qty: 2 }, { id: 'lockpick', qty: 1 }],
    abilities: ['crushing_blow', 'swift_step'],
  },
  {
    id: 'shadow', name: 'Shadow', icon: 'game-icons:hood',
    description: 'Cloak and bow. Unseen, unheard, unstoppable.',
    gear: { weapon: 'shortbow', head: 'cloth_bonnet', chest: 'linen_vestments', greaves: 'cloth_wraps' },
    consumables: [{ id: 'health_potion', qty: 2 }, { id: 'lockpick', qty: 2 }],
    abilities: ['dodge', 'fleet_foot'],
  },
  {
    id: 'arcane', name: 'Arcane', icon: 'game-icons:book-aura',
    description: 'Staff and scripture. Bends the weave to their will.',
    gear: { weapon: 'acolyte_staff', head: 'novice_cowl', chest: 'tattered_robe', greaves: 'monk_legwraps' },
    consumables: [{ id: 'health_potion', qty: 2 }, { id: 'lockpick', qty: 1 }],
    abilities: ['arcane_bolt', 'learned_lore'],
  },
  {
    id: 'wanderer', name: 'Wanderer', icon: 'game-icons:boots',
    description: 'No school, no master. Survives by instinct and grit.',
    gear: { weapon: 'weapon_default_bat', head: 'wooden_helmet', chest: 'wooden_chest', greaves: 'wooden_greaves' },
    consumables: [{ id: 'health_potion', qty: 3 }, { id: 'gold_key', qty: 1 }, { id: 'lockpick', qty: 2 }],
    abilities: ['grit', 'clarity'],
  },
]

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
  maxStackQty: number
  buyPrice: number
  count: number
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
  targeting: { kind: 'enemy' | 'ally' | 'self' | 'any'; scope: 'single' | 'all' | 'self'; type: 'physical' | 'magical' }
  minimumLevel: number
  minimumStats: Partial<Stats>
}

export interface PlayerRunEntity {
  base_stats: Stats
  stat_modifiers: Stats
  temp_stat_modifiers: Stats
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
  kit: StarterKitId
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
  enemies: EnemyPublicJSON[]
  exits: {
    north: ExitPublicJSON | null
    south: ExitPublicJSON | null
    east: ExitPublicJSON | null
    west: ExitPublicJSON | null
  }
  droppedItems: RunItem[]
}

export interface EnemyPublicJSON {
  id: string
  name: string
  threatLevel: number
  currentHealth: number
  maxHealth: number
  alive: boolean
  description: string
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

export interface VoteOption {
  id: string
  name: string
  description: string
}

export interface VoteJSON {
  id: string
  name: string
  description: string
  options: VoteOption[]
  votes: Record<string, string>
  duration: number
  deadlineAt: number
}

export interface RunSummaryPlayer {
  name: string
  kit: string
  level: number
  xp: number
  gold: number
  health: { CurrentHealth: number; MaxHealth: number }
  weapon: { weaponId: string; weaponName: string; description: string; stats: Stats; rarity: Rarity } | null
  armor: {
    head: { armorId: string; armorName: string; description: string; stats: Stats; gear_position: string; rarity: Rarity } | null
    chest: { armorId: string; armorName: string; description: string; stats: Stats; gear_position: string; rarity: Rarity } | null
    greaves: { armorId: string; armorName: string; description: string; stats: Stats; gear_position: string; rarity: Rarity } | null
  }
  abilities: Ability[]
  activeAbilities: { slot: number; id: string }[]
  inventory: RunItem[]
  base_stats: Record<string, number>
  stat_modifiers: Record<string, number>
}

export interface RunSummary {
  floor: number
  roomsExplored: number
  enemiesDefeated: number
  totalXP: number
  totalGold: number
  itemsFound: number
  players: RunSummaryPlayer[]
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
  encounter?: EncounterPublicState | null
  merchantDetails?: { stock: RunItem[]; available: boolean } | null
  currentVote?: VoteJSON | null
  runSummary?: RunSummary | null
  acceptedPlayerIds?: string[]
}

export type EncounterPhase = '' | 'vote' | 'combat'

export type CombatAction =
  | { type: 'attack' }
  | { type: 'ability'; abilityId: string }
  | { type: 'defend' }
  | { type: 'revive' }

export type CombatTarget =
  | { kind: 'enemy'; id: string }
  | { kind: 'ally'; id: string }
  | { kind: 'self' }

export interface EncounterInitiativeEntry {
  kind: 'player' | 'enemy'
  id: string
  name: string
  speed: number
  alive: boolean
}

export interface EncounterEnemy {
  id: string
  name: string
  threatLevel: number
  currentHealth: number
  maxHealth: number
  alive: boolean
  defending: boolean
}

export interface EncounterPublicState {
  active: boolean
  phase: EncounterPhase
  round: number
  currentTurnId: string | null
  currentTurnKind: 'player' | 'enemy' | null
  initiative: EncounterInitiativeEntry[]
  playerActions: Record<string, CombatAction | null>
  playerTargets: Record<string, CombatTarget>
  log: string[]
  downedPlayerIds: string[]
  enemies: EncounterEnemy[]
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

export async function selectCombatAction(
  roomToken: string,
  action: CombatAction,
): Promise<void> {
  await sendAction(roomToken, 'combat_select_action', action)
}

export async function sendVoteOption(roomToken: string, optionId: string): Promise<void> {
  await sendAction(roomToken, 'vote', { optionId })
}

export async function selectCombatTarget(
  roomToken: string,
  target: CombatTarget,
): Promise<void> {
  await sendAction(roomToken, 'combat_select_target', target)
}

export async function buyItem(roomToken: string, itemId: string): Promise<{ gold: number }> {
  const result = await request<{ gold: number }>('/api/rooms/action', roomToken, {
    method: 'POST',
    body: JSON.stringify({ action: 'buy_item', payload: { itemId } }),
  })
  return result
}

export async function sellItem(roomToken: string, index: number): Promise<{ gold: number; sold: number }> {
  const result = await request<{ gold: number; sold: number }>('/api/rooms/action', roomToken, {
    method: 'POST',
    body: JSON.stringify({ action: 'sell_item', payload: { index } }),
  })
  return result
}

export async function dropItem(roomToken: string, index: number, qty?: number): Promise<void> {
  await request<unknown>('/api/rooms/action', roomToken, {
    method: 'POST',
    body: JSON.stringify({ action: 'drop_item', payload: { index, qty } }),
  })
}

export async function pickUpItem(roomToken: string, itemIndex: number): Promise<void> {
  await request<unknown>('/api/rooms/action', roomToken, {
    method: 'POST',
    body: JSON.stringify({ action: 'pick_up_item', payload: { itemIndex } }),
  })
}

export async function returnToLobby(roomToken: string): Promise<void> {
  await request<unknown>('/api/rooms/action', roomToken, {
    method: 'POST',
    body: JSON.stringify({ action: 'return_to_lobby' }),
  })
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
