export type RoomEventType = "game-room-update" | "message-update" | "confirmation-update";

export interface MessageUpdatePayload {
    readonly resolverBusy: boolean;
    readonly messages: { from: string; message: string }[];
}

export interface ConfirmationUpdatePayload {
    readonly confirmation: unknown | null;
}

export interface IGameRoomBroadcaster {
    RoomUpdate(): void;
    MessageUpdate(): void;
    ConfirmationUpdate(): void;
    LastUpdateTime(): number;
}
