import { ConfirmationType } from "./broadcaster.js";

export interface IGameRoomConfirmationContext {
    Start(type: ConfirmationType, resolve: (accepted: boolean) => void): void;
    Vote(playerPublicId: string, accept: boolean): void;
    OnPlayerDisconnect(playerPublicId: string): void;
    readonly HasActive: boolean;
    readonly Type: ConfirmationType | null;
    readonly Votes: Record<string, boolean>;
    readonly DeadlineAt: number | null;
    readonly DurationMs: number | null;
}
