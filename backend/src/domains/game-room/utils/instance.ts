import { Socket } from "socket.io";
import { GameRoomPublicData, IGameRoomConfig } from "../types.js";
import { IPlayerRoomInstance, IPlayerJSON } from "./player.js";
import { GameRoomEventBus } from "../event.js";
import { GameRoomContext } from "./context.js";

export class GameRoom {
  private readonly _id: string;
  private readonly _inviteCode: string;

  private host: string;

  private context: GameRoomContext;

  constructor(
    id: string,
    inviteCode: string,
    host: string,
    config: IGameRoomConfig,
  ) {
    this._id = id;
    this._inviteCode = inviteCode;
    this.host = host;
    this.context = new GameRoomContext(config);
  }

  // Methods to manage players
  addPlayer(id: string, index: string): IPlayerRoomInstance | null {
    if (!this.context.IsRoomJoinable) {
      return null;
    }

    let player: IPlayerRoomInstance = { user_id: id, index: index, status: "joined", socket_id: null };
    this.context.addPlayer(player);


    if (this.host === "") {
      this.transferHost(id);
    }

    this.callOnGameRoomUpdate();
    return player;
  }

  removePlayer(playerId: string): boolean {

    let removed = this.context.removePlayer(playerId);
    if (!removed) {
      return false;
    }

    if (playerId === this.host) {
      const remainingPlayers = Array.from(this.context.Players).map(p => p.user_id);
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
    if (this.context.hasPlayer(newHostId)) {
      this.host = newHostId;
      this.callOnGameRoomUpdate();
    }
  }

  getPlayer(playerId: string): IPlayerRoomInstance | undefined {
    return this.context.getPlayer(playerId);
  }

  hasPlayer(playerId: string): boolean {
    return this.context.hasPlayer(playerId);
  }

  associatePlayerWithSocket(playerId: string, socket: Socket): void {
    let player = this.context.getPlayer(playerId);
    if (!player)
      return;

    if (player.socket_id && player.socket_id !== socket.id) {
      socket.emit("association-error", "Player is already associated with another socket.");
      socket.disconnect(true);
      return;
    }

    socket.join(`room-${this._id}`);
    player.socket_id = socket.id;
    player.status = "connected";
    this.callOnGameRoomUpdate();

  }

  dissociatePlayerFromSocket(playerId: string, socket: Socket): void {
    let player = this.context.getPlayer(playerId);
    if (!player || player.socket_id !== socket.id) {
      return;
    }
    
    socket.leave(`room-${this._id}`);
    player.socket_id = null;
    player.status = "disconnected";
    this.callOnGameRoomUpdate();

  }

  private callOnGameRoomUpdate() {
    this.context.updateLastActivityTimestamp();
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
    return Array.from(this.context.Players).map(player => ({
      index: player.index,
      status: player.status,
      isHost: player.user_id === this.host
    }));
  }

  public get JSON(): GameRoomPublicData {
    return {
      inviteCode: this._inviteCode,
      totalPlayers: this.context.PlayersCount,
      players: this.Players,
      config: this.Config,
    };
  }

  public get Config(): IGameRoomConfig {
    return this.context.Config;
  }

  public get LastActivityTimestamp(): number {
    return this.context.LastActivityTimestamp;
  }
}
