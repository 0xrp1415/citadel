import { Router, NextFunction, Request, Response } from "express";
import { GameRoomService } from "./service.js";
import { CheckUserExists } from "../user/middleware.js";
import { disconnectSocket } from "./socket.js";
import { IGameRoomRequest } from "./types.js";

const GameRoomRouter: Router = Router();

GameRoomRouter.post("/create", CheckUserExists, (req, res) => {
  const result = GameRoomService.Instance.createRoom(
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

GameRoomRouter.post("/join/:inviteCode", CheckUserExists, (req, res) => {
  const result = GameRoomService.Instance.joinRoom(
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

GameRoomRouter.post("/leave", requireRoomToken, (req, res) => {
  const roomRequest = req as IGameRoomRequest;
  const result = GameRoomService.Instance.leaveRoom(
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

GameRoomRouter.post("/ready", requireRoomToken, (req, res) => {
  const roomRequest = req as IGameRoomRequest;
  
  const result = GameRoomService.Instance.setPlayerReadyStatus(
    roomRequest.userId,
    roomRequest.roomId,
  );
  
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  
  res.status(200).json({ success: true });
});

GameRoomRouter.post("/start", requireRoomToken, (req, res) => {
  const roomRequest = req as IGameRoomRequest;
  const result = GameRoomService.Instance.startGame(
    roomRequest.userId,
    roomRequest.roomId,
  );
  
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(200).json({ success: true });
});

GameRoomRouter.post("/confirm-start", requireRoomToken, (req, res) => {
  const roomRequest = req as IGameRoomRequest;
  const result = GameRoomService.Instance.confirmStartGame(
    roomRequest.userId,
    roomRequest.roomId,
  );

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(200).json({ success: true });
});

GameRoomRouter.post("/action", requireRoomToken, (req, res) => {
  const roomRequest = req as IGameRoomRequest;
  const action = req.body.action ?? "";
  
  const result = GameRoomService.Instance.executePlayerAction(
    roomRequest.userId,
    roomRequest.roomId,
    action,
  );
  
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  
  res.status(200).json({ success: true });
});

GameRoomRouter.put("/room", requireRoomToken, (req, res) => {
  let roomRequest = req as IGameRoomRequest;
  let config = req.body.config ?? {};

  const result = GameRoomService.Instance.updateRoomConfig(
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
  roomRequest.roomId = result.value.room.ID;
  roomRequest.userId = result.value.userId;
  roomRequest.playerId = result.value.playerId;
  next();
}

export { GameRoomRouter };
