import { ConfirmActor } from "./actor.js";
import { IVoteJSON } from "./types.js";

export async function AsyncResolverVoteComplition(resolver: (ctx: IVoteJSON) => Promise<void> | void, vote_actor: ConfirmActor): Promise<void> {
    return new Promise((resolve, reject) => {
        vote_actor.onCloseListeners.push(async (ctx) => {
            try {
                await resolver(ctx);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
} 