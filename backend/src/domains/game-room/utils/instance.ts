import { GameRoomPublicData, IGameRoomConfig } from "../types.js";
import { IPlayerRoomInstance,IPlayerJSON } from "./player.js";

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
  public addPlayer(id: string, index: string): IPlayerRoomInstance {
    let player: IPlayerRoomInstance = { user_id: id, index: index };
    this.players.set(id, player);

    if (this.host === "") {
      this.transferHost(id);
    }
    this.lastActivityTimestamp = Date.now();
    return player;
  }

  public removePlayer(playerId: string): boolean {
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

    this.lastActivityTimestamp = Date.now();
    return true;
  }

  public transferHost(newHostId: string): void {
    if (this.players.has(newHostId)) {
      this.host = newHostId;
      this.lastActivityTimestamp = Date.now();
    }
  }

  public getPlayer(playerId: string): IPlayerRoomInstance | undefined {
    return this.players.get(playerId);
  }

  public hasPlayer(playerId: string): boolean {
    return this.players.has(playerId);
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
