import { NextFunction, Request, Response } from "express";
import { GameRoomRepository } from "./repository.js";
import { GameRoom } from "./utils/instance.js";
import crypto from "node:crypto";
import { sign } from "../../utils/hmac/sign.js";
import { verify } from "../../utils/hmac/verify.js";
import {
  IGameRoomRequest,
  TVerifyResult,
  ZGameRoomConfigSchema,
} from "./types.js";

export class GameRoomService {
  private static _instance: GameRoomService;
  private repository: GameRoomRepository;

  private constructor() {
    this.repository = new GameRoomRepository();
  }

  public static get Instance(): GameRoomService {
    if (!this._instance) {
      this._instance = new GameRoomService();
    }
    return this._instance;
  }

  public createGameRoom(req: Request, res: Response): void {
    if (!process.env.ROOM_SECRET_KEY) {
      res.status(500).json({
        error: "Server configuration error: ROOM_SECRET_KEY is not set.",
      });
      return;
    }

    if (!req.userID) {
      res.status(400).json({ error: "Host ID is missing in the request." });
      return;
    }

    let config = ZGameRoomConfigSchema.safeParse(req.body.config);

    if (!config.success) {
      res
        .status(400)
        .json({ error: "Game room configuration is missing or invalid." });
      return;
    }

    let inviteCode = this.generateInviteCode().toUpperCase();
    let gameRoom = new GameRoom(
      crypto.randomUUID(),
      inviteCode,
      req.userID,
      config.data,
    );

    let player = gameRoom.addPlayer(req.userID, crypto.randomUUID());

    this.repository.addGameRoom(gameRoom);

    let hash = sign(
      `${gameRoom.ID}@${req.userID}@${player.index}`,
      process.env.ROOM_SECRET_KEY,
    );

    res
      .status(201)
      .json({ inviteCode: inviteCode, hash: hash, room: gameRoom.JSON });
  }

  public joinGameRoom(req: Request, res: Response): void {
    const inviteCode = req.params.inviteCode;
    if (!process.env.ROOM_SECRET_KEY) {
      res.status(500).json({
        error: "Server configuration error: ROOM_SECRET_KEY is not set.",
      });
      return;
    }

    if (!req.userID) {
      res.status(400).json({ error: "User ID is missing in the request." });
      return;
    }

    if (!inviteCode?.trim() || typeof inviteCode !== "string") {
      res.status(400).json({ error: "Invite code is missing in the request." });
      return;
    }

    const gameRoom = this.repository.getGameRoomByInviteCode(
      inviteCode.toUpperCase(),
    );

    if (!gameRoom) {
      res.status(404).json({ error: "Game room not found." });
      return;
    }
    if (gameRoom.hasPlayer(req.userID)) {
      res.status(409).json({ error: "Player is already in the game room." });
      return;
    }

    if (gameRoom.Players.length >= gameRoom.Config.maxPlayers) {
      res.status(400).json({ error: "Game room is full." });
      return;
    }

    let player = gameRoom.addPlayer(req.userID, crypto.randomUUID());

    let hash = sign(
      `${gameRoom.ID}@${req.userID}@${player.index}`,
      process.env.ROOM_SECRET_KEY,
    );
    res.status(200).json({ hash: hash, room: gameRoom.JSON });
  }

  public verifyGameRoomRest(
    req: IGameRoomRequest,
    res: Response,
    next: NextFunction,
  ): void {
    let [authMode, token] = req.headers.authorization?.split(" ") || ["", ""];

    if (authMode !== "Bearer" || !token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    let result = this.verifyGameRoom(token);
    if (!result.isSuccess) {
      res
        .status(parseInt(result.errorCode))
        .json({ error: result.errorMessage });
      return;
    }

    req.roomId = result.payload.room.ID;
    req.userId = result.payload.userId;
    req.playerIndex = result.payload.playerIndex;
    next();
  }

  private verifyGameRoom(
    token: string | undefined,
  ): TVerifyResult<{ room: GameRoom; userId: string; playerIndex: string }> {
    if (!process.env.ROOM_SECRET_KEY) {
      return {
        isSuccess: false,
        errorCode: "500",
        errorMessage: "Server configuration error: ROOM_SECRET_KEY is not set.",
      };
    }

    if (!token) {
      return {
        isSuccess: false,
        errorCode: "400",
        errorMessage: "Token is required",
      };
    }
    let payload: string | null = null;

    try {
      payload = verify(token, process.env.ROOM_SECRET_KEY);
    } catch (error) {
      return {
        isSuccess: false,
        errorCode: "400",
        errorMessage: "Invalid token",
      };
    }
    if (!payload) {
      return {
        isSuccess: false,
        errorCode: "400",
        errorMessage: "Invalid token",
      };
    }

    let [roomId, userId, playerIndex] = payload.split("@");

    if (!roomId || !userId || !playerIndex) {
      return {
        isSuccess: false,
        errorCode: "400",
        errorMessage: "Invalid token format",
      };
    }

    let gameRoom = this.repository.getGameRoomById(roomId);

    if (!gameRoom) {
      return {
        isSuccess: false,
        errorCode: "404",
        errorMessage: "Game room not found",
      };
    }

    let player = gameRoom.getPlayer(userId);

    if (!player) {
      return {
        isSuccess: false,
        errorCode: "404",
        errorMessage: "Player not found in the game room",
      };
    }

    if (player.index !== playerIndex) {
      return {
        isSuccess: false,
        errorCode: "400",
        errorMessage: "Player index mismatch",
      };
    }

    return {
      isSuccess: true,
      payload: { room: gameRoom, userId: userId, playerIndex: playerIndex },
    };
  }

  public leaveGameRoom(req: IGameRoomRequest, res: Response): void {
    if (!req.roomId) {
      res.status(400).json({ error: "Room ID is missing in the request." });
      return;
    }
    
    const gameRoom = this.repository.getGameRoomById(
      req.roomId
    );

    if (!gameRoom) {
      res.status(404).json({ error: "Game room not found." });
      return;
    }

    if (!gameRoom.hasPlayer(req.userId)) {
      res.status(400).json({ error: "Player is not in the game room." });
      return;
    }

    gameRoom.removePlayer(req.userId);
    
    res.status(200).json({ message: "Player removed from the game room." , success: true, room: gameRoom.JSON });
  }

  // Private method to generate a random invite code
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
