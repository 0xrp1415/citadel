import { NextFunction, Request, Response } from "express";
import { GameRoomRepository } from "./repository.js";
import { GameRoom } from "./utils/instance.js";
import crypto from "node:crypto";
import { sign } from "../../utils/hmac/sign.js";
import { verify } from "../../utils/hmac/verify.js";
import {
  GameRoomPublicData,
  IGameRoomRequest,
  ISocketData,
  TVerifyResult,
  ZGameRoomConfigSchema,
} from "./types.js";
import { Server, DefaultEventsMap, Socket, ExtendedError } from "socket.io";
import { GameRoomEventBus } from "./event.js";

export class GameRoomService {

  private static _instance: GameRoomService;
  private repository: GameRoomRepository;

  private io: Server | null = null;

  private constructor() {
    this.repository = new GameRoomRepository();
    this.initGameRoomEventListeners();
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

    if (!player) {
      res.status(500).json({ error: "Failed to add host to the game room." });
      return;
    }

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

    if (!player) {
      res.status(403).json({ error: "Game room is not joinable." });
      return;
    }

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

    let player = gameRoom.getPlayer(req.userId);
    if (!player) {
      res.status(400).json({ error: "Player is not in the game room." });
      return;
    }



    if (this.io && player.socket_id) {
      let playerSocket = this.io.sockets.sockets.get(player.socket_id);
      if (playerSocket) {
        gameRoom.dissociatePlayerFromSocket(req.userId, playerSocket);
        playerSocket.disconnect(true);
      }
    }

    gameRoom.removePlayer(req.userId);

    res.status(200).json({ message: "Player removed from the game room.", success: true, room: gameRoom.JSON });
  }

  // Sets up socket event handlers for the game room
  public setupSocketHandlers(io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, ISocketData>): void {
    this.io = io;
    io.on("connection", (socket) => {
      let gameRoom = this.repository.getGameRoomById(socket.data.roomId);
      if (!gameRoom) {
        socket.disconnect(true);
        return;
      }
      gameRoom.associatePlayerWithSocket(socket.data.userId, socket);

      socket.on("disconnect", () => {
        gameRoom.dissociatePlayerFromSocket(socket.data.userId, socket);
      });
    });
  }

  // On GameRoom Chnage Event Listeners
  private initGameRoomEventListeners() {
    GameRoomEventBus.Instance.on("update", (data) => this.onGameRoomUpdate(data as { to: string, data: GameRoomPublicData }))
  }

  private onGameRoomUpdate(data: { to: string, data: GameRoomPublicData }): void {
    if (this.io)
      this.io.to(data.to).emit(`game-room-update`, data.data)
  }

  public verifyGameRoomSocket(socket: Socket, next: (err?: ExtendedError | undefined) => void) {
    let [authMode, token] = socket.handshake.auth.token?.split(" ") || ["", ""];

    if (authMode !== "Bearer" || !token) {
      return next(new Error("Unauthorized"));
    }

    let result = this.verifyGameRoom(token);
    if (!result.isSuccess) {
      return next(new Error(result.errorMessage));
    }

    // Attach room and user info to the socket object for later use
    socket.data.roomId = result.payload.room.ID;
    socket.data.userId = result.payload.userId;
    socket.data.playerIndex = result.payload.playerIndex;
    next();
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
}
