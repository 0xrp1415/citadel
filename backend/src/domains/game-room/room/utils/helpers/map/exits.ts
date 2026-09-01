import { IRoomMetadata } from "../../../../../procedural-engine/index.js";
import { IRoomPublicJSON } from "../../../types.js";

const DIRECTIONS = ["north", "south", "east", "west"] as const;

export function deriveRoomExits(roomId: number, exits: IRoomMetadata["exits"]): IRoomPublicJSON["exits"] {
    const out: IRoomPublicJSON["exits"] = { north: null, south: null, east: null, west: null };

    for (const dir of DIRECTIONS) {
        const passage = exits[dir];
        if (!passage) continue;
        out[dir] = {
            targetRoomId: passage.getOtherRoom(roomId)!,
            event: passage.Event,
            unlocked: passage.Unlocked,
        };
    }

    return out;
}