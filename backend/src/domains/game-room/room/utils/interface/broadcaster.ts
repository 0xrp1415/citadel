import { RunSummary } from "../../types.js";

export type RoomEventType = "game-room-update" | "message-update";

export interface IGameRoomBroadcaster {
    SetRunSummary(summary: RunSummary): void;
    SetAcceptedPlayers(ids: string[]): void;
    Reset(): void;
    RoomUpdate(): void;
    MessageUpdate(): void;
    LastUpdateTime(): number;
}
