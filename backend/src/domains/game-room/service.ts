import crypto from "node:crypto";
import { GameRoomRepository } from "./repository.js";
import { GameRoom } from "./room.js";
import { GameRoomPublicData, Result, ZGameRoomConfigSchema } from "./types.js";
import { createRoomToken, verifyRoomToken } from "./tokens.js";

type RoomBroadcaster = (roomId: string, data: GameRoomPublicData) => void;

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




  public createRoom(hostUserId: string, config: unknown): Result<CreateRoomResult> {
    const secret = this.getSecret();
    if (!secret) {
      return {
        ok: false,
        status: 500,
        error: "Server configuration error: ROOM_SECRET_KEY is not set.",
      };
    }
    if (!hostUserId) {
      return { ok: false, status: 400, error: "Host ID is missing in the request." };
    }

    const parsed = ZGameRoomConfigSchema.safeParse(config);
    if (!parsed.success) {
      return {
        ok: false,
        status: 400,
        error: "Game room configuration is missing or invalid.",
      };
    }

    const roomId = crypto.randomUUID();
    const inviteCode = this.generateInviteCode().toUpperCase();
    const gameRoom = new GameRoom(roomId, inviteCode, hostUserId, parsed.data, (data) =>
      this.broadcaster(roomId, data),
    );

    const player = gameRoom.addPlayer(hostUserId, crypto.randomUUID());
    if (!player) {
      return { ok: false, status: 500, error: "Failed to add host to the game room." };
    }

    this.repository.addGameRoom(gameRoom);

    const hash = createRoomToken(roomId, hostUserId, player.playerId, secret);

    return {
      ok: true,
      value: { inviteCode, hash, room: gameRoom.JSON },
    };
  }

  public joinRoom(userId: string, inviteCode: string): Result<JoinRoomResult> {
    const secret = this.getSecret();
    if (!secret) {
      return {
        ok: false,
        status: 500,
        error: "Server configuration error: ROOM_SECRET_KEY is not set.",
      };
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
    if (gameRoom.hasPlayer(userId)) {
      return { ok: false, status: 409, error: "Player is already in the game room." };
    }
    if (gameRoom.Players.length >= gameRoom.Config.maxPlayers) {
      return { ok: false, status: 400, error: "Game room is full." };
    }

    const player = gameRoom.addPlayer(userId, crypto.randomUUID());
    if (!player) {
      return { ok: false, status: 403, error: "Game room is not joinable." };
    }

    const hash = createRoomToken(gameRoom.ID, userId, player.playerId, secret);

    return { ok: true, value: { hash, room: gameRoom.JSON } };
  }

  public leaveRoom(userId: string, roomId: string): Result<LeaveRoomResult> {
    if (!roomId) {
      return { ok: false, status: 400, error: "Room ID is missing in the request." };
    }
    const gameRoom = this.repository.getGameRoomById(roomId);
    if (!gameRoom) {
      return { ok: false, status: 404, error: "Game room not found." };
    }

    const player = gameRoom.getPlayer(userId);
    if (!player) {
      return { ok: false, status: 400, error: "Player is not in the game room." };
    }

    const socketId = player.socketId;
    gameRoom.removePlayer(userId);

    if (gameRoom.Players.length === 0) {
      this.repository.removeGameRoomById(gameRoom.ID);
    }

    return { ok: true, value: { room: gameRoom.JSON, socketId } };
  }

  public updateRoomConfig(userId: string, roomId: string, config: unknown): Result<GameRoomPublicData> {
    if (!roomId) {
      return { ok: false, status: 400, error: "Room ID is missing in the request." };
    }

    const gameRoom = this.repository.getGameRoomById(roomId);
    if (!gameRoom) {
      return { ok: false, status: 404, error: "Game room not found." };
    }

    if (userId !== gameRoom.Host) {
      return { ok: false, status: 403, error: "Only the host can update the game room configuration." };
    }

    const parsed = ZGameRoomConfigSchema.safeParse(config);
    if (!parsed.success) {
      return { ok: false, status: 400, error: "Game room configuration is missing or invalid." };
    }

    if (!gameRoom.updateConfig(parsed.data)) {
      return { ok: false, status: 400, error: "Failed to update game room configuration." };
    }
    
    return { ok: true, value: gameRoom.JSON };
  }


  public setPlayerReadyStatus(userId: string, roomId: string): Result<boolean> {
    if (!roomId) {
      return { ok: false, status: 400, error: "Room ID is missing in the request." };
    }

    let gameRoom = this.repository.getGameRoomById(roomId);

    if (!gameRoom) {
      return { ok: false, status: 404, error: "Game room not found." };
    };

    let action_response = gameRoom.receivePlayerAction(userId, "player_toggle_ready");

    if (!action_response.success) {
      return { ok: false, status: 400, error: action_response.error };
    }
    
    return { ok: true, value: true };
  }

  public startGame(userId: string, roomId: string): Result<boolean> {
    if (!roomId) {
      return { ok: false, status: 400, error: "Room ID is missing in the request." };
    }

    let gameRoom = this.repository.getGameRoomById(roomId);

    if (!gameRoom) {
      return { ok: false, status: 404, error: "Game room not found." };
    }

    const result = gameRoom.receivePlayerAction(userId, "start_game");

    return result.success
      ? { ok: true, value: true }
      : { ok: false, status: 400, error: result.error };
  }
  
  public confirmStartGame(userId: string, roomId: string): Result<boolean> {
    if (!roomId) {
      return { ok: false, status: 400, error: "Room ID is missing in the request." };
    }

    let gameRoom = this.repository.getGameRoomById(roomId);

    if (!gameRoom) {
      return { ok: false, status: 404, error: "Game room not found." };
    }

    const result = gameRoom.receivePlayerAction(userId, "confirm_start");

    return result.success
      ? { ok: true, value: true }
      : { ok: false, status: 400, error: result.error };
  }

  public executePlayerAction(userId: string, roomId: string, action: string): Result<boolean> {
    if (!roomId) {
      return { ok: false, status: 400, error: "Room ID is missing in the request." };
    }

    let gameRoom = this.repository.getGameRoomById(roomId);

    if (!gameRoom) {
      return { ok: false, status: 404, error: "Game room not found." };
    }

    const result = gameRoom.receivePlayerAction(userId, action);

    return result.success
      ? { ok: true, value: true }
      : { ok: false, status: 400, error: result.error };
  }




  public verifyRoomMembership(token: string): Result<{ room: GameRoom; userId: string; playerId: string }> {
    const secret = this.getSecret();
    if (!secret) {
      return {
        ok: false,
        status: 500,
        error: "Server configuration error: ROOM_SECRET_KEY is not set.",
      };
    }

    const payload = verifyRoomToken(token, secret);
    if (!payload) {
      return { ok: false, status: 400, error: "Invalid token." };
    }

    const gameRoom = this.repository.getGameRoomById(payload.roomId);
    if (!gameRoom) {
      return { ok: false, status: 404, error: "Game room not found." };
    }

    const player = gameRoom.getPlayer(payload.userId);
    if (!player) {
      return { ok: false, status: 404, error: "Player not found in the game room." };
    }
    if (player.playerId !== payload.playerId) {
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
