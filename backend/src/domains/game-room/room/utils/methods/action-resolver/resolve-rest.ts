import { DmAction } from "../../../../../dungeon-master/schema/actions/action.js";
import { ERoomType } from "../../../../../procedural-engine/index.js";
import { Player } from "../../../../player/index.js";
import { IGameRoomContext } from "../../interface/index.js";

export async function resolveRest(action: DmAction, actor: Player | undefined, context: IGameRoomContext, narrate: (message: string) => Promise<void>): Promise<void> {
    if (!actor) return;
    const name = actor.Identity.name;

    if (context.Map.CurrentRoom?.type !== ERoomType.GRACE) {
        await narrate("Rest only works in a sanctuary.");
        return;
    }

    actor.Combat.changeHealthBy(actor.Combat.Health.MaxHealth - actor.Combat.Health.CurrentHealth);
    await narrate(`${name} rests at the sanctuary, recovering to full health.`);
}
