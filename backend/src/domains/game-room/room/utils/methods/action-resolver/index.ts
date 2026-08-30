import { DmAction } from "../../../../../dungeon-master/schema/actions/action.js";
import { Player } from "../../../../player/index.js";
import { IGameRoomContext } from "../../interface/index.js";
import { resolveMove } from "./resolve-move.js";
import { resolveRest } from "./resolve-rest.js";
import { resolveUseItem } from "./resolve-use-item.js";

export function resolveAction(action: DmAction, actor: Player | undefined, context: IGameRoomContext): string {
    switch (action.intent) {
        case "move": return resolveMove(action, actor, context);
        case "rest": return resolveRest(action, actor, context);
        case "use_item": return resolveUseItem(action, actor, context);
        default: return "";
    }
}
