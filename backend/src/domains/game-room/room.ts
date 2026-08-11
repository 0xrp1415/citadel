import { GameRoomPublicData, IGameRoomConfig } from "./types.js";
import { Player, PlayerPublic } from "./player.js";

export class GameRoom {
  private readonly _id: string;
  private readonly _inviteCode: string;

  private readonly players = new Map<string, Player>();
  private readonly config: IGameRoomConfig;
  private readonly broadcast: (data: GameRoomPublicData) => void;

  private host: string;
  private lastActivityAt: number = Date.now();
  private joinable: boolean = true;

  constructor(
    id: string,
    inviteCode: string,
    host: string,
    config: IGameRoomConfig,
    broadcast: (data: GameRoomPublicData) => void = () => {},
  ) {
    this._id = id;
    this._inviteCode = inviteCode;
    this.host = host;
    this.config = config;
    this.broadcast = broadcast;
  }

  addPlayer(userId: string, playerId: string): Player | null {
    if (!this.joinable) {
      return null;
    }

    const player: Player = {
      userId,
      playerId,
      socketId: null,
      status: "joined",
    };
    this.players.set(userId, player);

    if (this.host === "") {
      this.host = userId;
    }

    this.notify();
    return player;
  }

  removePlayer(userId: string): boolean {
    const removed = this.players.delete(userId);
    if (!removed) {
      return false;
    }

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

  setJoinable(isJoinable: boolean): void {
    this.joinable = isJoinable;
  }

  getPlayer(userId: string): Player | undefined {
    return this.players.get(userId);
  }

  hasPlayer(userId: string): boolean {
    return this.players.has(userId);
  }

  private notify(): void {
    this.lastActivityAt = Date.now();
    this.broadcast(this.JSON);
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

  get LastActivityTimestamp(): number {
    return this.lastActivityAt;
  }

  get IsRoomJoinable(): boolean {
    return this.joinable;
  }

  get Players(): PlayerPublic[] {
    return Array.from(this.players.values()).map((player) => ({
      playerId: player.playerId,
      status: player.status,
      isHost: player.userId === this.host,
    }));
  }

  get JSON(): GameRoomPublicData {
    return {
      inviteCode: this._inviteCode,
      totalPlayers: this.players.size,
      players: this.Players,
      config: this.config,
    };
  }
}
