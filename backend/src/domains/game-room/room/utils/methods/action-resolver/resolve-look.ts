import { DmAction } from "../../../../../dungeon-master/schema/actions/action.js";
import { Player } from "../../../../player/index.js";
import { IGameRoomContext } from "../../interface/index.js";
import { buildRoomFactContext } from "../../helpers/map/room-facts.js";

export async function resolveLook(action: DmAction, actor: Player | undefined, context: IGameRoomContext, narrate: (message: string) => Promise<void>): Promise<void> {
    const extra: string[] = [];
    if (actor) extra.push(`the party's attention is drawn to: ${actor.Identity.name} studies the chamber.`);
    if (action.detail) extra.push(`focus: ${action.detail}`);

    const contextText = buildRoomFactContext(
        context.Map.Map,
        context.Map.CurrentRoom,
        context.Map.VisitedRooms,
        context.Party.Players,
        { extra },
    );

    await narrate(contextText);
}
