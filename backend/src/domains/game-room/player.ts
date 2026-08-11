export type PlayerStatus =
  | "joined"
  | "connected"
  | "ready"
  | "disconnected"
  | "left"
  | "in-run";

export interface Player {
  userId: string;
  playerId: string;
  socketId: string | null;
  status: PlayerStatus;
}

export interface PlayerPublic {
  playerId: string;
  status: PlayerStatus;
  isHost: boolean;
}
