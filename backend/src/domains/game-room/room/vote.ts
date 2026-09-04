import { IGameRoomContext } from "./utils/interface/index.js";
import { IGameRoomVoteContext, VoteRule } from "./utils/interface/vote.js";
import { ConfirmActor, ConfirmationManager } from "./utils/helpers/confirmation/index.js";
import { IVoteOption } from "./utils/helpers/confirmation/types.js";

const DEFAULT_VOTE_DURATION_MS = 10_000;

export class GameRoomVoteManager implements IGameRoomVoteContext {
    private readonly context: IGameRoomContext;
    private actor: ConfirmActor | null = null;
    private resolveWinner: ((winnerOptionId: string | null) => void) | null = null;

    constructor(context: IGameRoomContext) {
        this.context = context;
    }

    public Start(name: string, description: string, options: IVoteOption[], rule: VoteRule, resolve: (winnerOptionId: string | null) => void): void {
        this.cancelPending();

        const allowedVoters = this.connectedPlayerIds();

        this.actor = ConfirmationManager.Instance.createConfirmation(
            name,
            description,
            options,
            DEFAULT_VOTE_DURATION_MS,
            allowedVoters,
        );

        this.resolveWinner = resolve;

        const actorRef = this.actor;
        this.actor.onCloseListeners.push((ctx) => {
            if (this.actor !== actorRef) return;
            const winnerId = this.resolveWinnerFromVotes(options, rule, ctx.votes);
            this.actor = null;
            this.resolveWinner = null;
            this.context.Broadcaster.RoomUpdate();
            resolve(winnerId);
        });

        this.actor.start();
        this.context.Broadcaster.RoomUpdate();
    }

    public Vote(playerPublicId: string, optionId: string): boolean {
        if (!this.actor) return false;
        const ok = this.actor.vote(playerPublicId, optionId);
        if (!ok) return false;

        if (this.allVotersHaveVoted()) {
            this.actor.close();
        } else {
            this.context.Broadcaster.RoomUpdate();
        }
        return true;
    }

    public OnPlayerDisconnect(playerPublicId: string): void {
        if (!this.actor) return;

        const remaining = this.connectedPlayerIds();
        if (remaining.length === 0) {
            this.actor.close();
            return;
        }

        if (this.allVotersHaveVoted()) {
            this.actor.close();
        } else {
            this.context.Broadcaster.RoomUpdate();
        }
    }

    public Cancel(): void {
        this.cancelPending();
    }

    public get CurrentVote() {
        return this.actor?.JSON ?? null;
    }

    public get HasActive(): boolean {
        return this.actor !== null;
    }

    private cancelPending(): void {
        if (!this.actor) return;
        const oldActor = this.actor;
        this.actor = null;
        this.resolveWinner = null;
        oldActor.close();
        this.context.Broadcaster.RoomUpdate();
    }

    private connectedPlayerIds(): string[] {
        return this.context.Party.Players
            .filter((p) => p.status !== "disconnected" && p.status !== "left" && p.status !== "joined")
            .map((p) => p.Identity.playerPublicId);
    }

    private allVotersHaveVoted(): boolean {
        if (!this.actor) return false;
        const pool = this.connectedPlayerIds();
        if (pool.length === 0) return false;
        const votes = this.actor.JSON.votes;
        return pool.every((id) => votes[id] !== undefined);
    }

    private resolveWinnerFromVotes(options: IVoteOption[], rule: VoteRule, votes: { [key: string]: string }): string | null {
        const pool = this.connectedPlayerIds();
        if (pool.length === 0) return null;

        const counts: Record<string, number> = {};
        for (const opt of options) counts[opt.id] = 0;
        for (const id of pool) {
            const choice = votes[id];
            if (choice && counts[choice] !== undefined) {
                counts[choice]++;
            }
        }

        if (rule === "unanimous") {
            for (const opt of options) {
                if (counts[opt.id] === pool.length) return opt.id;
            }
            return null;
        }

        let maxCount = 0;
        let winner: string | null = null;
        let ties = 0;
        for (const opt of options) {
            const c = counts[opt.id] ?? 0;
            if (c > maxCount) {
                maxCount = c;
                winner = opt.id;
                ties = 1;
            } else if (c === maxCount) {
                ties++;
            }
        }

        if (ties > 1 || maxCount === 0) return null;
        return winner;
    }
}
