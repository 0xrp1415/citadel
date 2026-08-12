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
  name: string;
  socketId: string | null;
  status: PlayerStatus;
  joinedAt?: number;
}

export interface PlayerPublic {
  playerId: string;
  name: string;
  status: PlayerStatus;
  isHost: boolean;
}
