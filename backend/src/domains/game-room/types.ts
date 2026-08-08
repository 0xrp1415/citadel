import { IPlayerJSON } from "./utils/player.js";
import { Request } from "express";
import { z } from "zod";
export interface GameRoomPublicData {

    players: IPlayerJSON[];
    totalPlayers: number;
    inviteCode: string;
    config: IGameRoomConfig;
}

export type TVerifyResult <TResult extends object> = |{
    isSuccess: true;
    payload: TResult;
}
| {
    isSuccess: false;
    errorCode: string;
    errorMessage: string;
}

export interface IGameRoomRequest extends Request
{
    userId: string;
    roomId: string;
    playerIndex: string;
}

export const ZGameRoomConfigSchema = z.object({
    maxPlayers: z.number().int().min(3).max(8).default(4),
})
export type IGameRoomConfig = z.infer<typeof ZGameRoomConfigSchema>;