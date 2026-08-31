import { DmAction } from "../../../../../dungeon-master/schema/actions/action.js";
import { Player } from "../../../../player/index.js";
import { IGameRoomContext } from "../../interface/index.js";

const POTION_HEAL = 20;

export async function resolveUseItem(action: DmAction, actor: Player | undefined, context: IGameRoomContext, narrate: (message: string) => Promise<void>): Promise<void> {
    if (!actor) return;
    const name = actor.Identity.name;
    const id = action.resource?.id;
    if (!id) {
        await narrate("No item was specified.");
        return;
    }

    switch (id) {
        case "health_potion": {
            if (actor.Inventory.Consumables.health_potion <= 0) {
                await narrate(`${name} reaches for a health potion, but none are left.`);
                return;
            }
            actor.Inventory.ChangeConsumable("health_potion", -1);
            actor.Combat.changeHealthBy(POTION_HEAL);
            await narrate(`${name} drinks a health potion, restoring ${POTION_HEAL} HP.`);
            return;
        }
        case "gold_key":
        case "lockpick": {
            if (actor.Inventory.Consumables[id] <= 0) {
                await narrate(`${name} has no ${id.replace("_", " ")} left.`);
                return;
            }
            await narrate(`${name} holds up a ${id.replace("_", " ")}.`);
            return;
        }
        default:
            await narrate(`${name} uses ${id}.`);
    }
}
