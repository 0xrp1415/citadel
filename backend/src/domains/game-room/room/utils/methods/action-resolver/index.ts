import { DmAction } from "../../../../../dungeon-master/schema/actions/action.js";
import { Player } from "../../../../player/index.js";
import { IGameRoomContext } from "../../interface/index.js";
import { resolveLook } from "./resolve-look.js";
import { resolveMove } from "./resolve-move.js";
import { resolveRest } from "./resolve-rest.js";
import { resolveUseItem } from "./resolve-use-item.js";

export async function resolveAction(action: DmAction, actor: Player | undefined, context: IGameRoomContext, narrate: (message: string) => Promise<void>): Promise<void> {
    switch (action.intent) {
        case "move": await resolveMove(action, actor, context, narrate); break;
        case "rest": await resolveRest(action, actor, context, narrate); break;
        case "use_item": await resolveUseItem(action, actor, context, narrate); break;
        case "look": await resolveLook(action, actor, context, narrate); break;
        default: break;
    }
}
