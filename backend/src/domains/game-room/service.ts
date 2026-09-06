import crypto from "node:crypto";
import { GameRoomRepository } from "./repository.js";
import { GameRoom } from "./room/index.js";
import { GameRoomPublicData } from "./room/types.js";
import { ZGameRoomConfigSchema } from "./room/utils/types.js";
import { Result } from "./types.js";
import { Player } from "./player/index.js";
import { createRoomToken, verifyRoomToken } from "./tokens.js";
import { RoomEventType } from "./room/utils/interface/index.js";

type RoomBroadcaster = (roomId: string, type: RoomEventType, data: unknown) => void;

interface CreateRoomResult {
  inviteCode: string;
  hash: string;
  room: GameRoomPublicData;
}

interface JoinRoomResult {
  hash: string;
  room: GameRoomPublicData;
}

interface LeaveRoomResult {
  room: GameRoomPublicData;
  socketId: string | null;
}

export class GameRoomService {
  private static _instance: GameRoomService | null = null;

  private readonly repository: GameRoomRepository;
  private broadcaster: RoomBroadcaster = () => { };

  constructor(repository = new GameRoomRepository()) {
    this.repository = repository;
  }

  public static get Instance(): GameRoomService {
    if (!this._instance) {
      this._instance = new GameRoomService();
    }
    return this._instance;
  }

  public configureBroadcast(broadcaster: RoomBroadcaster): void {
    this.broadcaster = broadcaster;
  }

  public async createRoom(hostUserId: string, config: unknown, name?: string): Promise<Result<CreateRoomResult>> {
    const secret = this.getSecret();
    if (!secret) {
      return { ok: false, status: 500, error: "Server configuration error: ROOM_SECRET_KEY is not set." };
    }
    if (!hostUserId) {
      return { ok: false, status: 400, error: "Host ID is missing in the request." };
    }

    const parsed = ZGameRoomConfigSchema.safeParse(config);
    if (!parsed.success) {
      return { ok: false, status: 400, error: "Game room configuration is missing or invalid." };
    }

    const roomId = crypto.randomUUID();
    const inviteCode = this.generateInviteCode().toUpperCase();
    const gameRoom = new GameRoom(
      { id: roomId, inviteCode, defaultConfig: parsed.data },
      (type, data) => this.broadcaster(roomId, type, data),
    );

    this.repository.addGameRoom(gameRoom);

    const playerId = crypto.randomUUID();
    const playerPublicId = crypto.randomUUID();
    const player = new Player(hostUserId, playerId, playerPublicId, name?.trim() || "Prisoner");
    const result = await gameRoom.StateMachine.DispatchPlayerAction(
      playerId, "player_join", { player },
    );

    if (!result.ok) {
      this.repository.removeGameRoomById(roomId);
      return { ok: false, status: result.status, error: result.error };
    }

    const hash = createRoomToken(roomId, hostUserId, playerId, secret);
    return { ok: true, value: { inviteCode, hash, room: gameRoom.JSON } };
  }

  public async joinRoom(userId: string, inviteCode: string, name?: string): Promise<Result<JoinRoomResult>> {
    const secret = this.getSecret();
    if (!secret) {
      return { ok: false, status: 500, error: "Server configuration error: ROOM_SECRET_KEY is not set." };
    }
    if (!userId) {
      return { ok: false, status: 400, error: "User ID is missing in the request." };
    }
    if (!inviteCode?.trim()) {
      return { ok: false, status: 400, error: "Invite code is missing in the request." };
    }

    const gameRoom = this.repository.getGameRoomByInviteCode(inviteCode.toUpperCase());
    if (!gameRoom) {
      return { ok: false, status: 404, error: "Game room not found." };
    }

    const playerId = crypto.randomUUID();
    const playerPublicId = crypto.randomUUID();
    const player = new Player(userId, playerId, playerPublicId, name?.trim() || "Prisoner");
    const result = await gameRoom.StateMachine.DispatchPlayerAction(
      playerId, "player_join", { player },
    );

    if (!result.ok) {
      return { ok: false, status: result.status, error: result.error };
    }

    const hash = createRoomToken(gameRoom.Identity.id, userId, playerId, secret);
    return { ok: true, value: { hash, room: gameRoom.JSON } };
  }

  public async leaveRoom(userId: string, roomId: string): Promise<Result<LeaveRoomResult>> {
    if (!roomId) {
      return { ok: false, status: 400, error: "Room ID is missing in the request." };
    }
    const gameRoom = this.repository.getGameRoomById(roomId);
    if (!gameRoom) {
      return { ok: false, status: 404, error: "Game room not found." };
    }

    const player = gameRoom.Party.Players.find((p) => p.Identity.userId === userId);
    if (!player) {
      return { ok: false, status: 400, error: "Player is not in the game room." };
    }

    const socketId = player.Socket.SocketId;
    const playerId = player.Identity.playerId;

    let result = await gameRoom.StateMachine.DispatchPlayerAction(playerId, "player_leave");

    if (!result.ok) {
      return { ok: false, status: result.status, error: result.error };
    }
    
    if (gameRoom.Party.PlayerCount === 0) {
      this.repository.removeGameRoomById(gameRoom.Identity.id);
    }

    return { ok: true, value: { room: gameRoom.JSON, socketId } };
  }

  public async updateRoomConfig(userId: string, roomId: string, config: unknown): Promise<Result<GameRoomPublicData>> {
    if (!roomId) {
      return { ok: false, status: 400, error: "Room ID is missing in the request." };
    }

    const gameRoom = this.repository.getGameRoomById(roomId);
    if (!gameRoom) {
      return { ok: false, status: 404, error: "Game room not found." };
    }

    const player = gameRoom.Party.Players.find((p) => p.Identity.userId === userId);
    if (!player) {
      return { ok: false, status: 404, error: "Player not found." };
    }

    const result = await gameRoom.StateMachine.DispatchPlayerAction(
      player.Identity.playerId, "update_config", { config },
    );

    if (!result.ok) {
      return { ok: false, status: result.status, error: result.error };
    }

    return { ok: true, value: gameRoom.JSON };
  }

  public async executePlayerAction(userId: string, roomId: string, action: string, payload?: unknown): Promise<Result<unknown>> {
    if (!roomId) {
      return { ok: false, status: 400, error: "Room ID is missing in the request." };
    }

    const gameRoom = this.repository.getGameRoomById(roomId);
    if (!gameRoom) {
      return { ok: false, status: 404, error: "Game room not found." };
    }

    const player = gameRoom.Party.Players.find((p) => p.Identity.userId === userId);
    if (!player) {
      return { ok: false, status: 404, error: "Player not found in the game room." };
    }

    const result = await gameRoom.StateMachine.DispatchPlayerAction(
      player.Identity.playerId, action, payload,
    );

    if (!result.ok) {
      return { ok: false, status: result.status, error: result.error };
    }

    return { ok: true, value: result.value };
  }

  public verifyRoomMembership(token: string): Result<{ room: GameRoom; userId: string; playerId: string }> {
    const secret = this.getSecret();
    if (!secret) {
      return { ok: false, status: 500, error: "Server configuration error: ROOM_SECRET_KEY is not set." };
    }

    const payload = verifyRoomToken(token, secret);
    if (!payload) {
      return { ok: false, status: 400, error: "Invalid token." };
    }

    const gameRoom = this.repository.getGameRoomById(payload.roomId);
    if (!gameRoom) {
      return { ok: false, status: 404, error: "Game room not found." };
    }

    const player = gameRoom.Party.Players.find((p) => p.Identity.userId === payload.userId);
    if (!player) {
      return { ok: false, status: 404, error: "Player not found in the game room." };
    }
    if (player.Identity.playerId !== payload.playerId) {
      return { ok: false, status: 400, error: "Player id mismatch." };
    }

    return {
      ok: true,
      value: { room: gameRoom, userId: payload.userId, playerId: payload.playerId },
    };
  }

  public getRoomById(roomId: string): GameRoom | undefined {
    return this.repository.getGameRoomById(roomId);
  }

  private getSecret(): string | null {
    return process.env.ROOM_SECRET_KEY ?? null;
  }

  private generateInviteCode(): string {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let inviteCode: string;
    do {
      inviteCode = Array.from({ length: 6 }, () =>
        characters.charAt(crypto.randomInt(0, characters.length)),
      ).join("");
    } while (this.repository.getGameRoomByInviteCode(inviteCode.toUpperCase()));
    return inviteCode;
  }
}
