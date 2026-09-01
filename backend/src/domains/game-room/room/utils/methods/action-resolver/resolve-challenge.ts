import { DmAction } from "../../../../../dungeon-master/schema/index.js";
import { Player } from "../../../../player/index.js";
import { IGameRoomContext } from "../../interface/index.js";
import { IStats, rollStatCheck } from "../../../../../procedural-engine/index.js";

const DC_BASE = 8;
const DC_PER_DIFFICULTY = 4;

export async function resolveChallenge(
    action: DmAction,
    actor: Player | undefined,
    context: IGameRoomContext,
    narrate: (message: string) => Promise<void>
): Promise<void> {
    if (!action.direction) return await narrate("The challenge action is missing a direction.");

    const passage = context.Map.CurrentRoom?.exits[action.direction];
    if (!passage) return await narrate(`There is no exit to the ${action.direction}.`);
    if (passage.Unlocked) return await narrate(`The passage to the ${action.direction} is already open.`);

    const event = passage.Event;
    if (!event) return await narrate(`Nothing bars the passage to the ${action.direction}.`);

    const stat: keyof IStats = event.requiredStat;
    const flavor = event.flavor_text || "A trial bars the way";

    let statValue: number;
    const who = event.type === "challenge" ? "the party" : (actor?.Identity.name ?? "the party");

    if (event.type === "challenge") {
        const players = context.Party.Players;
        statValue = players.length === 0
            ? 0
            : players.reduce((sum, p) => sum + p.Combat.EffectiveStats[stat], 0) / players.length;
    } else {
        if (!actor) return await narrate(`${flavor} ${who} steps forward, but no one is here to attempt it.`);
        statValue = actor.Combat.EffectiveStats[stat];
    }

    const dc = DC_BASE + event.difficulty * DC_PER_DIFFICULTY;
    const result = rollStatCheck(statValue, dc);

    if (result.success) {
        passage.unlock();
        await narrate(
            `${flavor} ${who} overcomes the ${event.type} trial (${stat})${event.type === "challenge" ? " as a party" : ""}. The passage to the ${action.direction} swings open.`
        );
    } else {
        await narrate(
            `${flavor} ${who} falters on the ${event.type} trial (${stat}). The passage to the ${action.direction} stays barred.`
        );
    }

    context.Broadcaster.RoomUpdate();
}
