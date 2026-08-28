import { IRoomMetadata } from "../../../../../procedural-engine/index.js";
import { IRoomPublicJSON } from "../../../types.js";

const DIRECTIONS = ["left", "right", "up", "down"] as const;

export function deriveRoomExits(roomId: number, exits: IRoomMetadata["exits"]): IRoomPublicJSON["exits"] {
    const out: IRoomPublicJSON["exits"] = { left: null, right: null, up: null, down: null };

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