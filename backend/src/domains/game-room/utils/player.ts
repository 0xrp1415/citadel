export interface IPlayerRoomInstance {
  user_id: string;
  index: string;
  socket_id: string | null;
  status: "joined" | "connected" | "ready" | "disconnected" | "left" | "in-run";
}

export interface IPlayerJSON extends Omit<IPlayerRoomInstance, "user_id" | "socket_id"> {
  isHost: boolean;
}
