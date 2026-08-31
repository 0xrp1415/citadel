export type RoomEventType = "game-room-update" | "message-update" | "confirmation-update";

export interface MessageUpdatePayload {
    readonly resolverBusy: boolean;
    readonly messages: { from: string; message: string }[];
}

export type ConfirmationType = "unanimous" | "majority";

export interface ConfirmationUpdatePayload {
    readonly type: ConfirmationType;
    readonly votes: Record<string, boolean>;
    readonly deadlineAt: number;
    readonly durationMs: number;
}

export interface IGameRoomBroadcaster {
    RoomUpdate(): void;
    MessageUpdate(): void;
    ConfirmationUpdate(): void;
    LastUpdateTime(): number;
}
