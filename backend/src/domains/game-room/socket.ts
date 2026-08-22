import { ExtendedError, Server, Socket } from "socket.io";
import { GameRoomService } from "./service.js";

let activeIo: Server | null = null;

export function SetupGameRoomSocketHandlers(io: Server): void {
  activeIo = io;

  io.use(verifyRoomSocket);
  io.on("connection", async (socket) => {
    const gameRoom = GameRoomService.Instance.getRoomById(socket.data.roomId);
    if (!gameRoom) {
      socket.disconnect(true);
      return;
    }

    const player = gameRoom.Party.Players.find((p) => p.Identity.userId === socket.data.userId);
    if (!player) {
      socket.disconnect(true);
      return;
    }

    if (player.Socket.SocketId && player.Socket.SocketId !== socket.id) {
      io.sockets.sockets.get(player.Socket.SocketId)?.disconnect(true);
    }

    socket.join(`room-${gameRoom.Identity.id}`);

    await gameRoom.GameRoomStateMachine.DispatchPlayerAction(
      player.Identity.playerId, "player_connect", { socketId: socket.id },
    );

    socket.on("disconnect", async () => {
      await gameRoom.GameRoomStateMachine.DispatchPlayerAction(
        player.Identity.playerId, "player_disconnect", { socketId: socket.id },
      );
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

  socket.data.roomId = result.value.room.Identity.id;
  socket.data.userId = result.value.userId;
  socket.data.playerId = result.value.playerId;
  next();
}
