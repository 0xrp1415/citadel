import { IGameRoomContext } from "./interface.js";

export type ActionResponse = { success: true } | { success: false, error: string }

export abstract class GameRoomState<TActions extends string = string> {
    protected gameRoom: IGameRoomContext;
    protected abstract id: string;

    constructor(gameRoom: IGameRoomContext) {
        this.gameRoom = gameRoom;
    }

    abstract onEnterState(): void;
    abstract onExitState(): void;
    abstract receivePlayerAction(userId: string, action: TActions, payload?: unknown): ActionResponse;
    abstract canJoinRoom(): boolean;
    abstract canChangeConfig(): boolean;

    public get ID() {
        return this.id;
    }
}