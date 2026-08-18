import { MulberryRNG } from "./rng.js";
import { ERoomType, Room } from "./room.js";
import { Direction, Passage, IPassageEvent } from "./passage.js";
import { IStats } from "./stats.js";

export interface IMapConfig {
    minRoomCount: number;
    maxRoomCount: number;
}

export interface IRoomMetadata {
    id: number;
    type: ERoomType;
    baseDifficulty: number;
    distanceBonus: number;
}

export interface IMap {
    rooms: Record<number, IRoomMetadata>;
    passages: Passage[];
}

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

const OFFSETS: Record<Direction, { dx: number; dy: number }> = {
    up:    { dx: 0,  dy: -1 },
    down:  { dx: 0,  dy: 1 },
    left:  { dx: -1, dy: 0 },
    right: { dx: 1,  dy: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
};

const EVENT_TYPES = ["combat", "puzzle", "challenge"] as const;

const EVENT_STATS: Record<string, (keyof IStats)[]> = {
    combat: ["strength", "hp"],
    puzzle: ["intelligence", "wisdom"],
    challenge: ["dexterity", "agility"],
};

export function GenerateMap(rng: MulberryRNG, mapConfig: IMapConfig): IMap {
    const roomCount = rng.roll(mapConfig.minRoomCount, mapConfig.maxRoomCount);
    const { rooms: roomInstances, passages } = GenerateRoomConnections(rng, roomCount);
    PlaceShortcutPassages(rng, roomInstances, passages);
    AssignRoomTypes(rng, roomInstances, passages);
    ComputeDistanceBonus(roomInstances, passages);
    GeneratePassageEvents(rng, passages, roomInstances);

    const rooms: Record<number, IRoomMetadata> = {};
    for (const [id, room] of Object.entries(roomInstances)) {
        rooms[Number(id)] = {
            id: room.ID,
            type: room.Type,
            baseDifficulty: room.BaseDifficulty,
            distanceBonus: room.DistanceBonus,
        };
    }
    return { rooms, passages };
}

function GenerateRoomConnections(rng: MulberryRNG, roomCount: number): { rooms: Record<number, Room>; passages: Passage[] } {
    const rooms: Record<number, Room> = {};
    const passages: Passage[] = [];
    const grid = new Map<string, Room>();
    let passageId = 0;

    const startRoom = new Room(0);
    rooms[0] = startRoom;
    grid.set("0,0", startRoom);

    let nextId = 1;
    let pos = { x: 0, y: 0 };
    let prevRoom = startRoom;

    while (nextId < roomCount) {
        const dir = rng.pick(DIRECTIONS);
        const offset = OFFSETS[dir];
        const target = { x: pos.x + offset.dx, y: pos.y + offset.dy };
        const key = `${target.x},${target.y}`;

        const existing = grid.get(key);
        if (existing) {
            linkIfAbsent(prevRoom, existing, dir, passages, passageId);
            passageId = passages.length;
            prevRoom = existing;
            pos = target;
        } else {
            const room = new Room(nextId);
            rooms[nextId] = room;
            grid.set(key, room);
            linkRooms(prevRoom, room, dir, passages, passageId);
            passageId = passages.length;
            prevRoom = room;
            pos = target;
            nextId++;
        }
    }

    for (const [key, room] of grid) {
        const parts = key.split(",");
        const gx = Number(parts[0]);
        const gy = Number(parts[1]);
        for (const dir of DIRECTIONS) {
            const offset = OFFSETS[dir];
            const neighborKey = `${gx + offset.dx},${gy + offset.dy}`;
            const neighbor = grid.get(neighborKey);
            if (neighbor) {
                linkIfAbsent(room, neighbor, dir, passages, passages.length);
            }
        }
    }

    return { rooms, passages };
}

function PlaceShortcutPassages(rng: MulberryRNG, rooms: Record<number, Room>, passages: Passage[]): void {
    const roomIds = Object.keys(rooms).map(Number);
    if (roomIds.length < 4) return;

    const shortcutCount = roomIds.length >= 8 ? 2 : 1;
    let placed = 0;
    let attempts = 0;
    const maxAttempts = 100;

    while (placed < shortcutCount && attempts < maxAttempts) {
        attempts++;

        const aId = rng.pick(roomIds);
        const a = rooms[aId];
        if (!a || a.type !== ERoomType.NORMAL) continue;

        const b = bfsFarthest(a, rooms, passages);
        if (!b || b.type !== ERoomType.NORMAL) continue;
        if (a.ID === b.ID) continue;
        if (areConnected(a, b, passages)) continue;

        const passage = new Passage(passages.length, a.ID, b.ID);
        passages.push(passage);
        placed++;
    }
}

function AssignRoomTypes(rng: MulberryRNG, rooms: Record<number, Room>, passages: Passage[]): void {
    const roomIds = Object.keys(rooms).map(Number);
    if (roomIds.length === 0) return;

    const firstId = roomIds[0];
    const firstRoom = firstId !== undefined ? rooms[firstId] : undefined;
    if (firstRoom) {
        firstRoom.setRoomType(ERoomType.GRACE);
    }

    if (roomIds.length < 2 || !firstRoom) return;

    const farthest = bfsFarthest(firstRoom, rooms, passages);
    if (farthest) {
        farthest.setRoomType(ERoomType.BOSS);
    }

    const candidates = roomIds
        .map((id) => rooms[id])
        .filter(
            (r): r is Room =>
                r !== undefined &&
                r.type === ERoomType.NORMAL,
        );

    if (candidates.length > 0) {
        const treasure = rng.pick(candidates);
        treasure.setRoomType(ERoomType.TREASURE);
    }

    if (roomIds.length >= 6) {
        const remaining = candidates.filter((r) => r.type === ERoomType.NORMAL);
        if (remaining.length > 0) {
            const miniboss = rng.pick(remaining);
            miniboss.setRoomType(ERoomType.MINIBOSS);
        }
    }
}

function ComputeDistanceBonus(rooms: Record<number, Room>, passages: Passage[]): void {
    const firstId = Object.keys(rooms).map(Number)[0];
    const firstRoom = firstId !== undefined ? rooms[firstId] : undefined;
    if (!firstRoom) return;

    const visited = new Set<number>();
    const queue: { roomId: number; depth: number }[] = [{ roomId: firstRoom.ID, depth: 0 }];
    visited.add(firstRoom.ID);

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;
        const currentRoom = rooms[current.roomId];
        if (!currentRoom) break;
        currentRoom.setDistanceBonus(current.depth);

        for (const passage of passages) {
            const otherId = passage.getOtherRoom(current.roomId);
            if (otherId !== null && !visited.has(otherId)) {
                visited.add(otherId);
                queue.push({ roomId: otherId, depth: current.depth + 1 });
            }
        }
    }
}

function GeneratePassageEvents(rng: MulberryRNG, passages: Passage[], rooms: Record<number, Room>): void {
    for (const passage of passages) {
        const roomA = rooms[passage.roomA];
        const roomB = rooms[passage.roomB];
        if (!roomA || !roomB) continue;

        const maxDepth = Math.max(roomA.DistanceBonus, roomB.DistanceBonus);
        const isShortcut = passages.filter(
            (p) => p.roomA === passage.roomA && p.roomB === passage.roomB ||
                   p.roomA === passage.roomB && p.roomB === passage.roomA
        ).length > 1;

        if (isShortcut) {
            const difficulty = 3 + Math.min(maxDepth, 2);
            const event = createPassageEvent(rng, difficulty);
            passage.setEvent(event);
        } else {
            let chance = 0.3;
            if (maxDepth >= 3) chance = 0.4;
            if (maxDepth >= 5) chance = 0.5;

            if (rng.chance(chance)) {
                const difficulty = 1 + Math.min(maxDepth, 3);
                const event = createPassageEvent(rng, difficulty);
                passage.setEvent(event);
            }
        }
    }
}

function createPassageEvent(rng: MulberryRNG, difficulty: number): IPassageEvent {
    const type = rng.pick(EVENT_TYPES);
    const possibleStats = EVENT_STATS[type] ?? ["strength"];
    const requiredStat = rng.pick(possibleStats);
    return { type, requiredStat, difficulty };
}

function bfsFarthest(start: Room, rooms: Record<number, Room>, passages: Passage[]): Room | null {
    const visited = new Set<number>();
    const queue: number[] = [start.ID];
    visited.add(start.ID);
    let farthestId = start.ID;

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (currentId === undefined) break;
        farthestId = currentId;

        for (const passage of passages) {
            const otherId = passage.getOtherRoom(currentId);
            if (otherId !== null && !visited.has(otherId)) {
                visited.add(otherId);
                queue.push(otherId);
            }
        }
    }

    return farthestId === start.ID ? null : (rooms[farthestId] ?? null);
}

function areConnected(a: Room, b: Room, passages: Passage[]): boolean {
    return passages.some(
        (p) =>
            (p.roomA === a.ID && p.roomB === b.ID) ||
            (p.roomA === b.ID && p.roomB === a.ID),
    );
}

function linkRooms(a: Room, b: Room, dir: Direction, passages: Passage[], passageId: number): void {
    const passage = new Passage(passageId, a.ID, b.ID, dir);
    a.setAdjacentPassage(dir, passage);
    b.setAdjacentPassage(OPPOSITE[dir], passage);
    passages.push(passage);
}

function linkIfAbsent(a: Room, b: Room, dir: Direction, passages: Passage[], passageId: number): void {
    if (a.adjacentPassages[dir] === null) {
        linkRooms(a, b, dir, passages, passageId);
    }
}
