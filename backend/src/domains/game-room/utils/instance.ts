import { Socket } from "socket.io";
import { GameRoomPublicData, IGameRoomConfig } from "../types.js";
import { IPlayerRoomInstance, IPlayerJSON } from "./player.js";
import { GameRoomEventBus } from "../event.js";

export class GameRoom {
  private readonly _id: string;
  private readonly _inviteCode: string;

  private host: string;
  private players: Map<string, IPlayerRoomInstance> = new Map<string, IPlayerRoomInstance>();

  private lastActivityTimestamp: number = Date.now();

  private config: IGameRoomConfig;

  constructor(
    id: string,
    inviteCode: string,
    host: string,
    config: IGameRoomConfig,
  ) {
    this._id = id;
    this._inviteCode = inviteCode;
    this.host = host;
    this.config = config;
  }

  // Methods to manage players
  addPlayer(id: string, index: string): IPlayerRoomInstance {
    let player: IPlayerRoomInstance = { user_id: id, index: index, status: "joined", socket_id: null };
    this.players.set(id, player);

    if (this.host === "") {
      this.transferHost(id);
    }
    this.callOnGameRoomUpdate();
    return player;
  }

  removePlayer(playerId: string): boolean {
    let player = this.players.get(playerId)
    let removed = this.players.delete(playerId);
    if (!removed) {
      return false;
    }
    
    if (playerId === this.host) {
      const remainingPlayers = Array.from(this.players.keys());
      if (remainingPlayers.length > 0) {
        this.transferHost(remainingPlayers[0]!);
      } else {
        this.host = "";
      }
    }

    this.callOnGameRoomUpdate();
    return true;
  }

  transferHost(newHostId: string): void {
    if (this.players.has(newHostId)) {
      this.host = newHostId;
      this.callOnGameRoomUpdate();
    }
  }

  getPlayer(playerId: string): IPlayerRoomInstance | undefined {
    return this.players.get(playerId);
  }

  hasPlayer(playerId: string): boolean {
    return this.players.has(playerId);
  }

  associatePlayerWithSocket(playerId: string, socket: Socket): void {
    let player = this.players.get(playerId);
    if (player) {
      socket.join(`room-${this._id}`);
      player.socket_id = socket.id;
      player.status = "connected";
      this.callOnGameRoomUpdate();
    }
  }

  dissociatePlayerFromSocket(playerId: string, socket: Socket): void {
    let player = this.players.get(playerId);
    if (player) {
      socket.leave(`room-${this._id}`);
      player.socket_id = null;
      player.status = "disconnected";
      this.callOnGameRoomUpdate();
    }
  }

  private callOnGameRoomUpdate() {
    this.lastActivityTimestamp = Date.now();
    GameRoomEventBus.Instance.emitEvent(`room-${this.ID}`, "update", this.JSON);
  }
  
  // Getters
  public get ID(): string {
    return this._id;
  }

  public get InviteCode(): string {
    return this._inviteCode;
  }

  public get Host(): string {
    return this.host;
  }

  public get Players(): IPlayerJSON[] {
    return Array.from(this.players.values()).map((player) => ({
      isHost: player.user_id === this.host,
      index: player.index,
      status: player.status,
    }));
  }

  public get JSON(): GameRoomPublicData {
    return {
      inviteCode: this._inviteCode,
      totalPlayers: this.players.size,
      players: this.Players,
      config: this.config,
    };
  }

  public get Config(): IGameRoomConfig {
    return this.config;
  }

  public get LastActivityTimestamp(): number {
    return this.lastActivityTimestamp;
  }
}
