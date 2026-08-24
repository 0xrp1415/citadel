import { MulberryRNG } from "../rng.js";
import { Direction, Passage } from "../passage.js";
import { Room } from "../room.js";
import { BACKTRACK_CHANCE, EXTRA_LINK_CHANCE, SAME_DIRECTION_WEIGHT, TURN_WEIGHT } from "./config.js";
import { linkIfAbsent, linkRooms } from "./connect.js";
import { Coord, DIRECTIONS, Grid, OFFSETS, coordKey, parseCoord } from "./grid.js";

export interface TopologyResult {
    rooms: Record<number, Room>;
    passages: Passage[];
    grid: Grid;
}

export function generateTopology(rng: MulberryRNG, roomCount: number): TopologyResult {
    const rooms: Record<number, Room> = {};
    const passages: Passage[] = [];
    const grid: Grid = new Map();

    const startRoom = new Room(0);
    rooms[0] = startRoom;
    grid.set(coordKey(0, 0), startRoom);

    const path: { room: Room; pos: Coord }[] = [{ room: startRoom, pos: { x: 0, y: 0 } }];
    let currentIdx = 0;
    let nextId = 1;
    let lastDir: Direction | null = null;

    while (nextId < roomCount) {
        const current = path[currentIdx]!;

        const validDirs = DIRECTIONS.filter((d) => {
            if (current.room.adjacentPassages[d] !== null) return false;
            const nKey = coordKey(current.pos.x + OFFSETS[d].dx, current.pos.y + OFFSETS[d].dy);
            return !grid.has(nKey);
        });

        if (validDirs.length === 0) {
            currentIdx--;
            lastDir = null;
            if (currentIdx < 0) {
                const openCell = findAnyOpenCell(grid);
                if (!openCell) break;
                path.length = 0;
                path.push(openCell);
                currentIdx = 0;
            }
            continue;
        }

        const weighted: Direction[] = [];
        for (const d of validDirs) {
            const copies = d === lastDir ? SAME_DIRECTION_WEIGHT : TURN_WEIGHT;
            for (let i = 0; i < copies; i++) weighted.push(d);
        }
        const dir: Direction = rng.pick(weighted);
        lastDir = dir;
        const targetPos = { x: current.pos.x + OFFSETS[dir].dx, y: current.pos.y + OFFSETS[dir].dy };
        const targetKey = coordKey(targetPos.x, targetPos.y);

        const newRoom = new Room(nextId);
        rooms[nextId] = newRoom;
        grid.set(targetKey, newRoom);
        linkRooms(current.room, newRoom, dir, passages, passages.length);
        nextId++;

        path.length = currentIdx + 1;
        path.push({ room: newRoom, pos: targetPos });
        currentIdx = path.length - 1;

        if (rng.chance(BACKTRACK_CHANCE)) {
            currentIdx--;
        }
    }

    for (const [key, room] of grid) {
        const pos = parseCoord(key);
        for (const dir of DIRECTIONS) {
            const neighbor = grid.get(coordKey(pos.x + OFFSETS[dir].dx, pos.y + OFFSETS[dir].dy));
            if (neighbor && room.adjacentPassages[dir] === null && rng.chance(EXTRA_LINK_CHANCE)) {
                linkIfAbsent(room, neighbor, dir, passages, passages.length);
            }
        }
    }

    return { rooms, passages, grid };
}

function findAnyOpenCell(grid: Grid): { room: Room; pos: Coord } | null {
    for (const [key, room] of grid) {
        const pos = parseCoord(key);
        for (const dir of DIRECTIONS) {
            if (room.adjacentPassages[dir] !== null) continue;
            if (!grid.has(coordKey(pos.x + OFFSETS[dir].dx, pos.y + OFFSETS[dir].dy))) {
                return { room, pos };
            }
        }
    }
    return null;
}
