export type RoomEventType = "game-room-update" | "message-update";

export interface MessageUpdatePayload {
    readonly resolverBusy: boolean;
    readonly messages: { from: string; message: string }[];
}

export interface IGameRoomBroadcaster {
    RoomUpdate(): void;
    MessageUpdate(): void;
    LastUpdateTime(): number;
}
