import { DmAction } from "../../../../../dungeon-master/schema/actions/action.js";
import { ERoomType } from "../../../../../procedural-engine/index.js";
import { Player } from "../../../../player/index.js";
import { IGameRoomContext } from "../../interface/index.js";

export function resolveRest(action: DmAction, actor: Player | undefined, context: IGameRoomContext): string {
    if (!actor) return "";
    const name = actor.Identity.name;

    if (context.Map.CurrentRoom?.type !== ERoomType.GRACE) {
        return "Rest only works in a sanctuary.";
    }

    actor.Combat.changeHealthBy(actor.Combat.Health.MaxHealth - actor.Combat.Health.CurrentHealth);
    return `${name} rests at the sanctuary, recovering to full health.`;
}
