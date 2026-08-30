import { DmAction } from "../../../../../dungeon-master/schema/actions/action.js";
import { Player } from "../../../../player/index.js";
import { IGameRoomContext } from "../../interface/index.js";

export function resolveMove(action: DmAction, actor: Player | undefined, context: IGameRoomContext): string {
    if (!action.direction) return "";
    const currentRoom = context.Map.CurrentRoom;
    if (!currentRoom) return "There is nowhere to go yet.";

    const passage = currentRoom.exits[action.direction];
    if (!passage) return `There is no exit to the ${action.direction}.`;
    if (!passage.Unlocked) {
        return `The passage to the ${action.direction} is locked.`;
    }

    const target = context.Map.Travel(action.direction);
    if (target === null) return `The passage to the ${action.direction} does not lead anywhere.`;

    return `${actor?.Identity.name ?? "The party"} moves ${action.direction}.`;
}
