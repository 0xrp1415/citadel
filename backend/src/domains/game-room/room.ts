import { GameRoomPublicData, IGameRoomConfig, IMapPublicJSON, IRoomPublicJSON, Result } from "./types.js";
import { Player, PlayerPublic, PlayerRunEntity, PlayerRunEntityRace } from "./player.js";
import { GameRoomState, ActionResponse } from "./states/abstract.js";
import { LobbyState } from "./states/start.js";
import { IGameRoomContext } from "./states/interface.js";
import { GameRoomEntityStatsDefaults } from "./defaults.js";
import { IStats, MulberryRNG, GenerateMap, IMap, IMapConfig, Passage } from "../procedural-engine/domain.js";


export class GameRoom implements IGameRoomContext {
  private readonly _id: string;
  private readonly _inviteCode: string;

  private readonly players = new Map<string, Player>();
  private readonly playerRunEntities = new Map<string, PlayerRunEntity>();

  private config: IGameRoomConfig;
  private readonly broadcast: (data: GameRoomPublicData) => void;

  private host: string;
  private lastActivityAt: number = Date.now();
  private currentState: GameRoomState | null = null;
  private _floor: number = 1;
  private _currentDifficulty: IGameRoomConfig["difficulty"] = "medium";
  private _currentRoomId: number = 0;
  private _map: IMap | null = null;


  constructor(
    id: string,
    inviteCode: string,
    host: string,
    config: IGameRoomConfig,
    broadcast: (data: GameRoomPublicData) => void = () => { },
  ) {
    this._id = id;
    this._inviteCode = inviteCode;
    this.host = host;
    this.config = config;
    this.broadcast = broadcast;
    this.setState(new LobbyState(this));
  }




  // Player Management
  addPlayer(userId: string, playerId: string, name: string): Player | null {
    if (this.currentState && !this.currentState.canJoinRoom()) return null;

    const player: Player = {
      userId,
      playerId,
      name,
      socketId: null,
      status: "joined",
      joinedAt: Date.now(),
    };
    this.players.set(userId, player);

    this.playerRunEntities.set(userId, GameRoomEntityStatsDefaults());

    if (this.host === "") {
      this.host = userId;
    }

    this.notify();
    return player;
  }

  removePlayer(userId: string): boolean {
    if (!this.players.delete(userId)) {
      return false;
    }

    this.playerRunEntities.delete(userId);

    if (userId === this.host) {
      const next = Array.from(this.players.values())[0];
      this.host = next ? next.userId : "";
    }

    this.notify();
    return true;
  }

  transferHost(newHostId: string): void {
    if (this.players.has(newHostId)) {
      this.host = newHostId;
      this.notify();
    }
  }

  kickPlayer(hostUserId: string, targetPlayerId: string): Result<{ socketId: string | null }> {
    if (hostUserId !== this.host) {
      return { ok: false, status: 403, error: "Only the host can expel a member." };
    }

    const target = this.getPlayerByPlayerId(targetPlayerId);
    if (!target) {
      return { ok: false, status: 404, error: "Player not found in the game room." };
    }

    if (target.userId === this.host) {
      return { ok: false, status: 400, error: "The host cannot expel themselves." };
    }

    this.removePlayer(target.userId);

    return { ok: true, value: { socketId: target.socketId } };
  }

  // Handle socket connections and disconnections
  setSocket(userId: string, socketId: string): void {
    const player = this.players.get(userId);
    if (!player) {
      return;
    }

    player.socketId = socketId;
    if (player.status !== "ready" && player.status !== "in-run") {
      player.status = "connected";
    }
    this.notify();
  }

  clearSocket(userId: string, socketId: string): void {
    const player = this.players.get(userId);
    if (!player || player.socketId !== socketId) {
      return;
    }

    player.socketId = null;
    player.status = "disconnected";
    this.notify();
  }

  // Player Reading
  getPlayer(userId: string): Player | undefined {
    return this.players.get(userId);
  }

  getPlayerByPlayerId(playerId: string): Player | undefined {
    return Array.from(this.players.values()).find((p) => p.playerId === playerId);
  }

  hasPlayer(userId: string): boolean {
    return this.players.has(userId);
  }

  // Player Run Entity Management
  resetPlayerRunEntityStats(userId: string): boolean {
    this.playerRunEntities.set(userId, GameRoomEntityStatsDefaults())
    return true;
  }

  public getPlayerRunEntity(userId: string): PlayerRunEntity | undefined {
    return this.playerRunEntities.get(userId);
  }

  setPlayerRace(userId: string, race: PlayerRunEntityRace): boolean {
    const playerRunEntity = this.playerRunEntities.get(userId);

    if (!playerRunEntity) {
      return false;
    }

    playerRunEntity.setRace(race);
    return true;
  }

  changePlayerStatsBy(userId: string, stat: keyof IStats, amount: number): boolean {
    const playerRunEntity = this.playerRunEntities.get(userId);

    if (!playerRunEntity) {
      return false;
    }


    let result = playerRunEntity.modifySkill(stat, amount);

    if (!result) {
      return false;
    }

    if (stat === "hp") {
      playerRunEntity.resetHealth();
    }

    return true;
  }

  // Handle Config Updates
  updateConfig(config: IGameRoomConfig) {
    if (this.currentState && !this.currentState.canChangeConfig()) return false;

    this.config = config;
    this.notify();
    return true;
  }

  // Handle State Transitions
  setState(newState: GameRoomState) {
    if (this.currentState && newState.ID === this.currentState.ID)
      throw new Error("Moving to Same State");


    this.currentState?.onExitState()
    this.currentState = newState;
    this.currentState.onEnterState();
    this.notify();
  }

  // Handle Player State
  setPlayersStatus(status: Player["status"]): void {
    for (const player of this.players.values()) {
      player.status = status;
    }
  }

  // Handle Player Actions
  receivePlayerAction(userId: string, action: string, payload?: unknown): ActionResponse {
    if (!this.currentState) {
      return { success: false, error: "No current state" };
    }

    const player = this.players.get(userId);

    if (!player) {
      return { success: false, error: "Player not found" };
    }

    const response = this.currentState.receivePlayerAction(player.userId, action, payload);
    if (response.success) this.notify();
    return response;
  }

  // Handle Room Updates
  notify(): void {
    this.lastActivityAt = Date.now();
    this.broadcast(this.JSON);
  }

  // Map Generation
  public GenerateRoom(): void {
    const rng = MulberryRNG.fromSeed(this.config.seed + this._floor);
    const mapConfig = difficultyToMapConfig(this._currentDifficulty, this.config.mapSize);
    this._map = GenerateMap(rng, mapConfig);
    this._currentRoomId = this._map.startRoomIndex;
  }

  public nextFloor(): void {
    this._floor++;
    this.GenerateRoom();
  }

  public resetRun(): void {
    this._floor = 1;
    this._currentDifficulty = this.config.difficulty;
    this.GenerateRoom();
  }


  get ID(): string {
    return this._id;
  }

  get InviteCode(): string {
    return this._inviteCode;
  }

  get Host(): string {
    return this.host;
  }

  get Config(): IGameRoomConfig {
    return this.config;
  }

  get Floor(): number {
    return this._floor;
  }

  get CurrentRoomId(): number {
    return this._currentRoomId;
  }

  get CurrentDifficulty(): IGameRoomConfig["difficulty"] {
    return this._currentDifficulty;
  }

  get Map(): IMap | null {
    return this._map;
  }

  get LastActivityTimestamp(): number {
    return this.lastActivityAt;
  }

  get Players(): Player[] {
    return Array.from(this.players.values())
  }

  get PlayersPublic(): PlayerPublic[] {
    return Array.from(this.players.values()).map(player => ({
      playerId: player.playerId,
      name: player.name,
      status: player.status,
      isHost: player.userId === this.host,
      stats: (this.playerRunEntities.get(player.userId) ?? GameRoomEntityStatsDefaults()).JSON
    }));
  }

  get JSON(): GameRoomPublicData {
    const currentRoomType = this._map?.rooms[this._currentRoomId]?.type ?? "grace";
    return {
      inviteCode: this._inviteCode,
      totalPlayers: this.players.size,
      players: this.PlayersPublic,
      config: this.config,
      status: this.currentState?.ID || "unknown",
      floor: this._floor,
      currentRoom: { type: currentRoomType, index: this._currentRoomId },
      map: this._map ? serializeMap(this._map, this._currentRoomId) : null,
    };
  }
}

function difficultyToMapConfig(difficulty: IGameRoomConfig["difficulty"], mapSize: IGameRoomConfig["mapSize"]): IMapConfig {
  const sizeRanges: Record<string, { min: number; max: number; secrets: number }> = {
    small: { min: 10, max: 15, secrets: 1 },
    medium: { min: 25, max: 30, secrets: 2 },
    large: { min: 35, max: 40, secrets: 4 },
  };
  const range = sizeRanges[mapSize] ?? sizeRanges.medium!;

  const difficultyScale: Record<string, number> = {
    easy: 0.8,
    medium: 1,
    hard: 1.2,
  };
  const scale = difficultyScale[difficulty] ?? 1;

  return {
    minRoomCount: Math.round(range.min * scale),
    maxRoomCount: Math.round(range.max * scale),
    secretCount: range.secrets,
  };
}

function serializeMap(map: IMap, currentRoomId: number): IMapPublicJSON {
  const sortedIds = Object.keys(map.rooms).map(Number).sort((a, b) => a - b);
  const rooms: IRoomPublicJSON[] = sortedIds.map((roomId) => {
    const meta = map.rooms[roomId]!;
    return {
      type: meta.type,
      baseDifficulty: meta.baseDifficulty,
      distanceBonus: meta.distanceBonus,
      isCurrentRoom: roomId === currentRoomId,
      adjacentRooms: deriveAdjacentRooms(roomId, map.passages),
    };
  });
  const passages: IMapPublicJSON["passages"] = map.passages.map((p) => ({
    id: p.ID,
    roomA: p.RoomA,
    roomB: p.RoomB,
    direction: p.Direction,
    event: p.Event,
    unlocked: p.Unlocked,
  }));
  return { rooms, passages, startRoomIndex: map.startRoomIndex };
}

const OPPOSITE: Record<string, string> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function deriveAdjacentRooms(roomId: number, passages: Passage[]): IRoomPublicJSON["adjacentRooms"] {
  const result: IRoomPublicJSON["adjacentRooms"] = { left: null, right: null, up: null, down: null };
  for (const passage of passages) {
    if (passage.roomA === roomId && passage.Direction !== null) {
      result[passage.Direction] = passage.roomB;
    } else if (passage.roomB === roomId && passage.Direction !== null) {
      const reverse = OPPOSITE[passage.Direction];
      if (reverse === "left" || reverse === "right" || reverse === "up" || reverse === "down") {
        result[reverse] = passage.roomA;
      }
    }
  }
  return result;
}
