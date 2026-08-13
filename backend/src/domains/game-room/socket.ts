import { ExtendedError, Server, Socket } from "socket.io";
import { GameRoomService } from "./service.js";

let activeIo: Server | null = null;

export function SetupGameRoomSocketHandlers(io: Server): void {
  activeIo = io;

  GameRoomService.Instance.configureBroadcast((roomId, data) => {
    io.to(`room-${roomId}`).emit("game-room-update", data);
  });

  io.use(verifyRoomSocket);
  io.on("connection", (socket) => {
    const gameRoom = GameRoomService.Instance.getRoomById(socket.data.roomId);
    if (!gameRoom) {
      socket.disconnect(true);
      return;
    }

    const player = gameRoom.getPlayer(socket.data.userId);
    if (!player) {
      socket.disconnect(true);
      return;
    }

    if (player.socketId && player.socketId !== socket.id) {
      io.sockets.sockets.get(player.socketId)?.disconnect(true);
    }

    socket.join(`room-${gameRoom.ID}`);
    gameRoom.setSocket(socket.data.userId, socket.id);

    socket.on("disconnect", () => {
      gameRoom.clearSocket(socket.data.userId, socket.id);
    });
  });
}

export function disconnectSocket(socketId: string, notice?: { event: string; data: unknown }): void {
  const socket = activeIo?.sockets.sockets.get(socketId);
  if (!socket) {
    return;
  }
  if (notice) {
    socket.emit(notice.event, notice.data);
  }
  socket.disconnect(true);
}

function verifyRoomSocket(socket: Socket, next: (err?: ExtendedError) => void): void {
  const [authMode, token] = socket.handshake.auth.token?.split(" ") || ["", ""];
  if (authMode !== "Bearer" || !token) {
    next(new Error("Unauthorized"));
    return;
  }

  const result = GameRoomService.Instance.verifyRoomMembership(token);
  if (!result.ok) {
    next(new Error(result.error));
    return;
  }

  socket.data.roomId = result.value.room.ID;
  socket.data.userId = result.value.userId;
  socket.data.playerId = result.value.playerId;
  next();
}
