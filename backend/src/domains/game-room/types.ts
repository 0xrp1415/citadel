import { z } from "zod";
import { Request } from "express";
import { PlayerPublic } from "./player.js";

export const ZGameRoomConfigSchema = z.object({
  maxPlayers: z.number().int().min(3).max(8).default(4),
});
export type IGameRoomConfig = z.infer<typeof ZGameRoomConfigSchema>;

export interface GameRoomPublicData {
  players: PlayerPublic[];
  totalPlayers: number;
  inviteCode: string;
  config: IGameRoomConfig;
}

export interface IGameRoomRequest extends Request {
  userId: string;
  roomId: string;
  playerId: string;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

export interface ISocketData {
  userId: string;
  roomId: string;
  playerId: string;
}
