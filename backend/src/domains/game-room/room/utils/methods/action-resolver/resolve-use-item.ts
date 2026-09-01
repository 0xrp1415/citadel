import { DmAction } from "../../../../../dungeon-master/schema/actions/action.js";
import { Player } from "../../../../player/index.js";
import { POTION_HEAL } from "../../../../player/inventory.js";
import { IGameRoomContext } from "../../interface/index.js";

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
            if (!actor.Inventory.useItem("health_potion", actor.Combat)) {
                await narrate(`${name} reaches for a health potion, but none are left.`);
                return;
            }
            await narrate(`${name} drinks a health potion, restoring ${POTION_HEAL} HP.`);
            return;
        }
        case "gold_key":
        case "lockpick": {
            if (actor.Inventory.CountOf(id) <= 0) {
                await narrate(`${name} has no ${id.replace("_", " ")} left.`);
                return;
            }
            await narrate(`${name} holds up a ${id.replace("_", " ")}.`);
            return;
        }
        default: {
            const item = actor.Inventory.Inventory.find((entry) => entry.id === id);
            if (item && item.type === "scroll") {
                if (!actor.Inventory.useItem(id, actor.Combat, actor.Abilities)) {
                    await narrate(`${name} reaches for a scroll, but none are left.`);
                    return;
                }
                await narrate(`${name} reads a scroll and learns ${item.metadata.ability.name}.`);
                return;
            }
            await narrate(`${name} uses ${id}.`);
        }
    }
}