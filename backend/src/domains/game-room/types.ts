import { Request } from "express";

export interface IGameRoomRequest extends Request {
  userId: string;
  roomId: string;
  playerId: string;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };