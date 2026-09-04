import { IVoteJSON, IVoteOption } from "../helpers/confirmation/types.js";

export type VoteRule = "majority" | "unanimous";

export interface IGameRoomVoteContext {
    Start(name: string, description: string, options: IVoteOption[], rule: VoteRule, resolve: (winnerOptionId: string | null) => void): void;
    Vote(playerPublicId: string, optionId: string): boolean;
    OnPlayerDisconnect(playerPublicId: string): void;
    Cancel(): void;
    readonly CurrentVote: IVoteJSON | null;
    readonly HasActive: boolean;
}
