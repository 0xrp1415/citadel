import { IGameRoomConfirmationContext } from "./utils/interface/index.js";
import { IGameRoomContext } from "./utils/interface/index.js";
import { ConfirmationType } from "./utils/interface/broadcaster.js";

const VOTE_DURATION_MS = 10_000;

export class GameRoomConfirmationManager implements IGameRoomConfirmationContext {
    private readonly context: IGameRoomContext;
    private active: boolean = false;
    private type: ConfirmationType | null = null;
    private votes: Record<string, boolean> = {};
    private resolve: ((accepted: boolean) => void) | null = null;
    private deadlineAt: number | null = null;
    private durationMs: number | null = null;
    private timer: NodeJS.Timeout | null = null;

    constructor(context: IGameRoomContext) {
        this.context = context;
    }

    public Start(type: ConfirmationType, resolve: (accepted: boolean) => void): void {
        this.abortPending();
        this.active = true;
        this.type = type;
        this.votes = {};
        this.resolve = resolve;
        this.deadlineAt = Date.now() + VOTE_DURATION_MS;
        this.durationMs = VOTE_DURATION_MS;
        this.timer = setTimeout(() => {
            this.timer = null;
            this.finish(this.isAccepted());
        }, VOTE_DURATION_MS);
        this.broadcast();
    }

    public Vote(playerPublicId: string, accept: boolean): void {
        if (!this.active || !this.type) return;
        this.votes[playerPublicId] = accept;
        this.broadcast();
    }

    public OnPlayerDisconnect(playerPublicId: string): void {
        if (!this.active) return;
        delete this.votes[playerPublicId];

        const pool = this.connectedPool();
        if (pool.length === 0) {
            this.finish(false);
            return;
        }
        this.broadcast();
    }

    public get HasActive(): boolean {
        return this.active;
    }

    public get Type(): ConfirmationType | null {
        return this.type;
    }

    public get Votes(): Record<string, boolean> {
        return { ...this.votes };
    }

    public get DeadlineAt(): number | null {
        return this.deadlineAt;
    }

    public get DurationMs(): number | null {
        return this.durationMs;
    }

    private connectedPool(): string[] {
        return this.context.Party.Players
            .filter((p) => p.status !== "disconnected" && p.status !== "left" && p.status !== "joined")
            .map((p) => p.Identity.playerPublicId);
    }

    private isAccepted(): boolean {
        const pool = this.connectedPool();
        if (pool.length === 0) return false;

        if (this.type === "majority") {
            const yes = pool.filter((id) => this.votes[id] !== false).length;
            return yes >= Math.ceil(pool.length / 2);
        }

        for (const id of pool) {
            if (this.votes[id] === false) return false;
        }
        return true;
    }

    private finish(accepted: boolean): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        const resolve = this.resolve;
        this.active = false;
        this.type = null;
        this.votes = {};
        this.resolve = null;
        this.deadlineAt = null;
        this.durationMs = null;
        this.broadcast();
        resolve?.(accepted);
    }

    private abortPending(): void {
        if (!this.active) return;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        const resolve = this.resolve;
        this.active = false;
        this.type = null;
        this.votes = {};
        this.resolve = null;
        this.deadlineAt = null;
        this.durationMs = null;
        resolve?.(false);
    }

    private broadcast(): void {
        this.context.Broadcaster.ConfirmationUpdate();
    }
}
