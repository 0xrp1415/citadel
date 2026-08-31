import { IMap, IRoomMetadata } from "../../../../../procedural-engine/index.js";
import { Player } from "../../../../player/index.js";
import { deriveRoomExits } from "./exits.js";

const DIRS = ["left", "right", "up", "down"] as const;

export interface IRoomFactContextOptions {
    transition?: string;
    extra?: string[];
}

function partyLine(players: Player[]): string {
    if (players.length === 0) return "party: (empty)";
    const status = (p: Player) => (p.Combat.Health.CurrentHealth > 0 ? "alive" : "down");
    return `party: ${players.map((p) => `${p.Identity.name} (${status(p)})`).join(", ")}`;
}

export function buildRoomFactContext(
    map: IMap | null,
    currentRoom: IRoomMetadata | null,
    visitedRooms: Set<number>,
    players: Player[],
    options: IRoomFactContextOptions = {},
): string {
    if (!currentRoom) return `The party stands in a bare, featureless space. There is nothing here yet.\n${partyLine(players)}`;

    const lines: string[] = [];
    if (options.transition) lines.push(`transition: ${options.transition}`);
    if (options.extra) lines.push(...options.extra);

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

    lines.push(partyLine(players));

    return lines.join("\n");
}
