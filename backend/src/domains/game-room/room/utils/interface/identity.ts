import { IGameRoomConfig } from "../types.js";

export interface IGameRoomIdentityContext {
    readonly id: string;
    readonly inviteCode: string;
    readonly Config: IGameRoomConfig;
    SetConfig(config: IGameRoomConfig): void;
}
