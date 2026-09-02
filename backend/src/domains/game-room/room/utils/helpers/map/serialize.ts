import { IMap } from "../../../../../procedural-engine/index.js";
import { IMapPublicJSON, IRoomPublicJSON } from "../../../types.js";
import { deriveRoomExits } from "./exits.js";

export function serializeMap(map: IMap, currentRoomIndex: number, visitedRooms: Set<number>): IMapPublicJSON {
    const sortedIds = Object.keys(map.rooms).map(Number).sort((a, b) => a - b);

    const rooms: IRoomPublicJSON[] = sortedIds.map((roomId) => {
        const meta = map.rooms[roomId]!;
        return {
            type: meta.type,
            baseDifficulty: meta.baseDifficulty,
            distanceBonus: meta.distanceBonus,
            isCurrentRoom: roomId === currentRoomIndex,
            isVisited: visitedRooms.has(roomId),
            enemies: (meta.encounters?.enemies ?? []).map((enemy) => ({
                id: enemy.id,
                name: enemy.name,
                threatLevel: enemy.threatLevel,
                currentHealth: enemy.currentHealth,
                maxHealth: enemy.maxHealth,
                alive: enemy.alive,
                description: enemy.description,
            })),
            exits: deriveRoomExits(roomId, meta.exits),
        };
    });

    return { rooms, startRoomIndex: map.startRoomIndex };
}

