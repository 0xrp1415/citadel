import { MulberryRNG } from "./rng.js";
import { ERoomType } from "./room.js";
import { Passage } from "./passage.js";
import { buildNeighborIndex } from "./generation/graph.js";
import { assignRoomTypes } from "./generation/room-types.js";
import { spawnSecretRooms } from "./generation/secrets.js";
import { generatePassageEvents } from "./generation/events.js";
import { generateTopology } from "./generation/topology.js";
import { selectEnemiesForRoom } from "./generation/encounters.js";
import { EnemyEntity } from "./enemy/entity.js";
import { IItem } from "./item/base.js";

export interface IMapConfig {
    minRoomCount: number;
    maxRoomCount: number;
    dificulty: number;
    secretCount: number;
}

export interface IRoomExits {
    north: Passage | null;
    south: Passage | null;
    east: Passage | null;
    west: Passage | null;
}

export interface IRoomMetadata {
    id: number;
    type: ERoomType;
    baseDifficulty: number;
    distanceBonus: number;
    exits: IRoomExits;
    encounters? : IEncounter;
    droppedItems: IItem[];
}

export interface IEncounter {
    enemies: EnemyEntity[];
}

export interface IMap {
    rooms: Record<number, IRoomMetadata>;
    startRoomIndex: number;
}

export function generateMap(rng: MulberryRNG, mapConfig: IMapConfig, floor: number = 1): IMap {
    const roomCount = rng.roll(mapConfig.minRoomCount, mapConfig.maxRoomCount);
    const { rooms, passages, grid } = generateTopology(rng, roomCount);
    const neighbors = buildNeighborIndex(rooms, passages);
    const startRoomIndex = assignRoomTypes(rooms, neighbors, rng);
    spawnSecretRooms(rooms, passages, grid, neighbors, rng, mapConfig.secretCount);
    generatePassageEvents(rng, passages, rooms);

    const roomMetadata: Record<number, IRoomMetadata> = {};
    for (const [id, room] of Object.entries(rooms)) {
        const roomEncounters = selectEnemiesForRoom(room, floor, rng);
        roomMetadata[Number(id)] = {
            id: room.ID,
            type: room.Type,
            baseDifficulty: room.BaseDifficulty,
            distanceBonus: room.DistanceBonus,
            exits: room.AdjacentPassages,
            droppedItems: [],
            ...(roomEncounters ? { encounters: { enemies: roomEncounters } } : {}),
        };
    }
    return { rooms: roomMetadata, startRoomIndex };
}
