import { GameRoom } from "./room/index.js";
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
export class GameRoomRepository {
  private readonly _gameRooms: Map<string, GameRoom>;
  private readonly _inviteCodeToIdMap: Map<string, string> = new Map<
    string,
    string
  >();

  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this._gameRooms = new Map<string, GameRoom>();
    this.cleanupInterval = this.initializeGameRoomCleanup().unref();
  }

  public addGameRoom(gameRoom: GameRoom): void {
    this._gameRooms.set(gameRoom.Identity.id, gameRoom);
    this._inviteCodeToIdMap.set(gameRoom.Identity.inviteCode, gameRoom.Identity.id);
  }

  public getGameRoomById(id: string): GameRoom | undefined {
    return this._gameRooms.get(id);
  }

  public getGameRoomByInviteCode(inviteCode: string): GameRoom | undefined {
    const id = this._inviteCodeToIdMap.get(inviteCode);
    if (!id) {
      return undefined;
    }
    return this._gameRooms.get(id);
  }

  public removeGameRoomById(id: string): void {
    const gameRoom = this._gameRooms.get(id);
    if (gameRoom) {
      this._inviteCodeToIdMap.delete(gameRoom.Identity.inviteCode);
      this._gameRooms.delete(id);
    }
  }

  private initializeGameRoomCleanup() {
    return setInterval(() => {
      const now = Date.now();
      for (const [id, gameRoom] of this._gameRooms.entries()) {
        if (now - gameRoom.LastUpdateTime() > INACTIVITY_THRESHOLD_MS || gameRoom.Party.PlayerCount === 0) {
          this.removeGameRoomById(id);
        }
      }
    }, CLEANUP_INTERVAL_MS);
  }
}
