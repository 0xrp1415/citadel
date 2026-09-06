import { Router, NextFunction, Request, Response } from "express";
import { GameRoomService } from "./service.js";
import { CheckUserExists } from "../user/middleware.js";
import { disconnectSocket } from "./socket.js";
import { IGameRoomRequest } from "./types.js";

const GameRoomRouter: Router = Router();

GameRoomRouter.post("/create", CheckUserExists, async (req, res) => {
  const result = await GameRoomService.Instance.createRoom(
    req.userID ?? "",
    req.body.config,
    req.body.name,
  );
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.status(201).json(result.value);
});

GameRoomRouter.post("/join/:inviteCode", CheckUserExists, async (req, res) => {
  const result = await GameRoomService.Instance.joinRoom(
    req.userID ?? "",
    req.params.inviteCode ?? "",
    req.body.name,
  );
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.status(200).json(result.value);
});

GameRoomRouter.post("/leave", requireRoomToken, async (req, res) => {
  const roomRequest = req as IGameRoomRequest;
  const result = await GameRoomService.Instance.leaveRoom(
    roomRequest.userId,
    roomRequest.roomId,
  );
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  if (result.value.socketId) {
    disconnectSocket(result.value.socketId);
  }
  res.status(200).json({
    message: "Player removed from the game room.",
    success: true,
    room: result.value.room,
  });
});

GameRoomRouter.post("/kick", requireRoomToken, async (req, res) => {
  const roomRequest = req as IGameRoomRequest;
  const targetPlayerId = req.body.playerId ?? "";

  if (!targetPlayerId) {
    res.status(400).json({ error: "No player was named for expulsion." });
    return;
  }

  const gameRoom = GameRoomService.Instance.getRoomById(roomRequest.roomId);
  if (!gameRoom) {
    res.status(404).json({ error: "Game room not found." });
    return;
  }

  const target = gameRoom.Party.getPlayer(targetPlayerId);
  const socketId = target?.Socket.SocketId ?? null;

  const result = await GameRoomService.Instance.executePlayerAction(
    roomRequest.userId, roomRequest.roomId, "kick_player", { targetPlayerId },
  );

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  if (socketId) {
    disconnectSocket(socketId, { event: "game-room-kicked", data: {} });
  }

  res.status(200).json({ success: true });
});

GameRoomRouter.post("/action", requireRoomToken, async (req, res) => {
  const roomRequest = req as IGameRoomRequest;
  const action = req.body.action ?? "";
  const payload = req.body.payload ?? undefined;

  const result = await GameRoomService.Instance.executePlayerAction(
    roomRequest.userId,
    roomRequest.roomId,
    action,
    payload,
  );

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(200).json({ success: true, data: result.value });
});

GameRoomRouter.put("/room", requireRoomToken, async (req, res) => {
  let roomRequest = req as IGameRoomRequest;
  let config = req.body.config ?? {};

  const result = await GameRoomService.Instance.updateRoomConfig(
    roomRequest.userId,
    roomRequest.roomId,
    config,
  );

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(200).json({ success: true, room: result.value });
});

function requireRoomToken(req: Request, res: Response, next: NextFunction): void {
  const [authMode, token] = req.headers.authorization?.split(" ") || ["", ""];
  if (authMode !== "Bearer" || !token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const result = GameRoomService.Instance.verifyRoomMembership(token);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  const roomRequest = req as IGameRoomRequest;
  roomRequest.roomId = result.value.room.Identity.id;
  roomRequest.userId = result.value.userId;
  roomRequest.playerId = result.value.playerId;
  next();
}

export { GameRoomRouter };
