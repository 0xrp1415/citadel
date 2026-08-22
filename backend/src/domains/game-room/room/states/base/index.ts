import { IGameRoomContext } from "../../utils/interface/index.js";
import { ActionHandler, TResult } from "../../utils/types.js";

export abstract class GameRoomState {
    protected context: IGameRoomContext;
    protected readonly abstract _id: string;
    protected abstract readonly actions: Record<string, ActionHandler>;

    constructor(context: IGameRoomContext) {
        this.context = context;
    }

    public abstract onEnterState(): void;
    public abstract onExitState(): void;

    public async receivePlayerAction(playerId: string, action: string, payload?: unknown): Promise<TResult<unknown>> {
        const handler = this.actions[action];
        if (handler) return handler(playerId, payload);
        return { ok: false, status: 400, error: `Invalid action: ${action}` };
    }

    public get ID(): string {
        return this._id;
    }
}