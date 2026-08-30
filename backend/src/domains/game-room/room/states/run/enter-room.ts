import { IRoomMetadata } from "../../../../procedural-engine/index.js";
import { IGameRoomContext } from "../../utils/interface/index.js";
import { deriveRoomExits } from "../../utils/helpers/map/exits.js";

function buildRoomDescription(currentRoom: IRoomMetadata | null): string {
    if (!currentRoom) return "The party stands in a bare, featureless space. There is nothing here yet.";

    const exits = deriveRoomExits(currentRoom.id, currentRoom.exits);
    const dirs = ["left", "right", "up", "down"] as const;
    const exitLines: string[] = [];
    for (const d of dirs) {
        const exit = exits[d];
        if (!exit) { exitLines.push(`- ${d}: none`); continue; }
        const eve = exit.event
            ? ` (${exit.event.type} trial demanding ${exit.event.requiredStat})`
            : "";
        exitLines.push(`- ${d}: a passage to room #${exit.targetRoomId}${eve}, ${exit.unlocked ? "open" : "locked"}`);
    }

    return [
        `The party has entered room #${currentRoom.id}, which is a "${currentRoom.type}" chamber.`,
        "Its exits:",
        ...exitLines,
    ].join("\n");
}

export async function enterRoom(ctx: IGameRoomContext, targetRoomIndex: number): Promise<string> {
    ctx.Map.EnterRoom(targetRoomIndex);
    ctx.Broadcaster.RoomUpdate();

    const description = buildRoomDescription(ctx.Map.CurrentRoom);
    const narration = await ctx.DMAdapter.Narrate("dungeon_master", description);
    ctx.Broadcaster.MessageUpdate();
    return narration;
}
