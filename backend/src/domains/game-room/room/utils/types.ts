import z from "zod";

export const ZGameRoomConfigSchema = z.object({
  maxPlayers: z.number().int().min(3).max(8).default(4),
  seed: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  mapSize: z.enum(["small", "medium", "large"]).default("medium"),
});

export type IGameRoomConfig = z.infer<typeof ZGameRoomConfigSchema>;

export interface IGameRoomIdentity {
  id: string;
  inviteCode: string;
  defaultConfig?: IGameRoomConfig;
}

export type TResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

export type ActionHandler = (playerId: string, payload?: unknown) => TResult<unknown>;