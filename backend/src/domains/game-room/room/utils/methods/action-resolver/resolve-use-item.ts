import { DmAction } from "../../../../../dungeon-master/schema/actions/action.js";
import { Player } from "../../../../player/index.js";
import { IGameRoomContext } from "../../interface/index.js";

const POTION_HEAL = 20;

export function resolveUseItem(action: DmAction, actor: Player | undefined, context: IGameRoomContext): string {
    if (!actor) return "";
    const name = actor.Identity.name;
    const id = action.resource?.id;
    if (!id) return "No item was specified.";

    switch (id) {
        case "health_potion": {
            if (actor.Inventory.Consumables.health_potion <= 0) {
                return `${name} reaches for a health potion, but none are left.`;
            }
            actor.Inventory.ChangeConsumable("health_potion", -1);
            actor.Combat.changeHealthBy(POTION_HEAL);
            return `${name} drinks a health potion, restoring ${POTION_HEAL} HP.`;
        }
        case "gold_key":
        case "lockpick": {
            if (actor.Inventory.Consumables[id] <= 0) {
                return `${name} has no ${id.replace("_", " ")} left.`;
            }
            return `${name} holds up a ${id.replace("_", " ")}.`;
        }
        default:
            return `${name} uses ${id}.`;
    }
}
