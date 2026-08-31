import { IGameRoomContext } from "../../utils/interface/index.js";
import { buildRoomFactContext } from "../../utils/helpers/map/room-facts.js";

export async function enterRoom(
    ctx: IGameRoomContext,
    targetRoomIndex: number,
    narrate?: (description: string) => Promise<void>,
    transition?: string,
): Promise<string> {
    ctx.Map.EnterRoom(targetRoomIndex);
    ctx.Broadcaster.RoomUpdate();

    const description = buildRoomFactContext(ctx.Map.Map, ctx.Map.CurrentRoom, ctx.Map.VisitedRooms, ctx.Party.Players, {
        transition,
    });

    if (narrate) {
        await narrate(description);
        return description;
    }

    const narration = await ctx.DMAdapter.Narrate(description);
    ctx.Broadcaster.MessageUpdate();
    return narration;
}
