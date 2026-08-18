import { z } from "zod";
import { Request } from "express";
import { PlayerPublic } from "./player.js";

export const ZGameRoomConfigSchema = z.object({
  maxPlayers: z.number().int().min(3).max(8).default(4),
  seed: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  mapSize: z.enum(["small", "medium", "large"]).default("medium"),
});

export type IGameRoomConfig = z.infer<typeof ZGameRoomConfigSchema>;

export interface IRoomPublicJSON {
    type: string;
    baseDifficulty: number;
    distanceBonus: number;
    isCurrentRoom: boolean;
    adjacentRooms: {
        left: number | null;
        right: number | null;
        up: number | null;
        down: number | null;
    };
}

export interface IPassagePublicJSON {
    id: number;
    roomA: number;
    roomB: number;
    direction: string | null;
    event: { type: string; requiredStat: string; difficulty: number } | null;
    unlocked: boolean;
}

export interface IMapPublicJSON {
    rooms: IRoomPublicJSON[];
    passages: IPassagePublicJSON[];
}

export interface GameRoomPublicData {
  readonly players: PlayerPublic[];
  readonly totalPlayers: number;
  readonly inviteCode: string;
  readonly config: IGameRoomConfig;
  readonly status: string;
  readonly floor: number;
  readonly currentRoom: { type: string; index: number };
  readonly map: IMapPublicJSON | null;
}

export interface IGameRoomRequest extends Request {
  userId: string;
  roomId: string;
  playerId: string;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };
