import { IMap, IRoomMetadata } from "../../../../procedural-engine/index.js";
import { IGameRoomContext } from "../../utils/interface/index.js";
import { deriveRoomExits } from "../../utils/helpers/map/exits.js";

const DIRS = ["left", "right", "up", "down"] as const;

function buildFactContext(
    map: IMap | null,
    currentRoom: IRoomMetadata | null,
    visitedRooms: Set<number>,
    transition?: string,
): string {
    if (!currentRoom) return "The party stands in a bare, featureless space. There is nothing here yet.";

    const lines: string[] = [];
    if (transition) lines.push(`transition: ${transition}`);

    const visited = visitedRooms.has(currentRoom.id);
    lines.push(
        `room: a "${currentRoom.type}" chamber${visited ? " that the party has seen before (visited: true)" : ""}.`
    );

    const exits = deriveRoomExits(currentRoom.id, currentRoom.exits);
    const exitLines: string[] = [];
    for (const d of DIRS) {
        const exit = exits[d];
        if (!exit) continue;
        const destType = map?.rooms[exit.targetRoomId]?.type ?? "unknown";
        const trial = exit.event
            ? ` a ${exit.event.type} trial demanding ${exit.event.requiredStat}`
            : "";
        const state = exit.unlocked
            ? "open"
            : `locked; the gate-keeper bars it${trial ? `, demanding${trial}` : "."}`;
        exitLines.push(`- exit ${d}: to a ${destType} chamber, ${state}`);
    }
    if (exitLines.length === 0) {
        lines.push("exits: none");
    } else {
        lines.push("exits:");
        lines.push(...exitLines);
    }

    return lines.join("\n");
}

export async function enterRoom(
    ctx: IGameRoomContext,
    targetRoomIndex: number,
    narrate?: (description: string) => Promise<void>,
    transition?: string,
): Promise<string> {
    ctx.Map.EnterRoom(targetRoomIndex);
    ctx.Broadcaster.RoomUpdate();

    const description = buildFactContext(ctx.Map.Map, ctx.Map.CurrentRoom, ctx.Map.VisitedRooms, transition);

    if (narrate) {
        await narrate(description);
        return description;
    }

    const narration = await ctx.DMAdapter.Narrate(description);
    ctx.Broadcaster.MessageUpdate();
    return narration;
}
