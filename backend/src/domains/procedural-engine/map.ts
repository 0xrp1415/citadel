import { MulberryRNG } from "./rng.js";
import { ERoomType, Room } from "./room.js";
import { Direction, Passage, IPassageEvent } from "./passage.js";
import { IStats } from "./stats.js";

export interface IMapConfig {
    minRoomCount: number;
    maxRoomCount: number;
    secretCount: number;
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
    startRoomIndex: number;
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
    const { rooms: roomInstances, passages, grid } = GenerateRoomConnections(rng, roomCount);
    const startRoomIndex = AssignRoomTypes(roomInstances, passages, rng);
    SpawnSecretRooms(roomInstances, passages, grid, rng, mapConfig.secretCount);
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
    return { rooms, passages, startRoomIndex };
}

function GenerateRoomConnections(rng: MulberryRNG, roomCount: number): { rooms: Record<number, Room>; passages: Passage[]; grid: Map<string, Room> } {
    const rooms: Record<number, Room> = {};
    const passages: Passage[] = [];
    const grid = new Map<string, Room>();

    const startRoom = new Room(0);
    rooms[0] = startRoom;
    grid.set("0,0", startRoom);

    const path: { room: Room; pos: { x: number; y: number } }[] = [{ room: startRoom, pos: { x: 0, y: 0 } }];
    let currentIdx = 0;
    let nextId = 1;
    let lastDir: Direction | null = null;

    while (nextId < roomCount) {
        const current = path[currentIdx]!;

        const validDirs = DIRECTIONS.filter((d) => {
            if (current.room.adjacentPassages[d] !== null) return false;
            const nKey = `${current.pos.x + OFFSETS[d].dx},${current.pos.y + OFFSETS[d].dy}`;
            return !grid.has(nKey);
        });

        if (validDirs.length === 0) {
            currentIdx--;
            lastDir = null;
            if (currentIdx < 0) {
                let restarted = false;
                for (const [key, room] of grid) {
                    const parts = key.split(",");
                    const gx = Number(parts[0]);
                    const gy = Number(parts[1]);
                    for (const d of DIRECTIONS) {
                        if (room.adjacentPassages[d] !== null) continue;
                        const nKey = `${gx + OFFSETS[d].dx},${gy + OFFSETS[d].dy}`;
                        if (!grid.has(nKey)) {
                            path.length = 0;
                            path.push({ room, pos: { x: gx, y: gy } });
                            currentIdx = 0;
                            restarted = true;
                            break;
                        }
                    }
                    if (restarted) break;
                }
                if (!restarted) break;
            }
            continue;
        }

        const weighted: Direction[] = [];
        for (const d of validDirs) {
            const copies = d === lastDir ? 5 : 2;
            for (let i = 0; i < copies; i++) weighted.push(d);
        }
        const dir: Direction = rng.pick(weighted);
        lastDir = dir;
        const targetPos = { x: current.pos.x + OFFSETS[dir].dx, y: current.pos.y + OFFSETS[dir].dy };
        const targetKey = `${targetPos.x},${targetPos.y}`;

        const newRoom = new Room(nextId);
        rooms[nextId] = newRoom;
        grid.set(targetKey, newRoom);
        linkRooms(current.room, newRoom, dir, passages, passages.length);
        nextId++;

        path.length = currentIdx + 1;
        path.push({ room: newRoom, pos: targetPos });
        currentIdx = path.length - 1;

        if (rng.chance(0.10)) {
            currentIdx--;
        }
    }

    for (const [key, room] of grid) {
        const parts = key.split(",");
        const gx = Number(parts[0]);
        const gy = Number(parts[1]);
        for (const dir of DIRECTIONS) {
            const nKey = `${gx + OFFSETS[dir].dx},${gy + OFFSETS[dir].dy}`;
            const neighbor = grid.get(nKey);
            if (neighbor && room.adjacentPassages[dir] === null && rng.chance(0.35)) {
                linkIfAbsent(room, neighbor, dir, passages, passages.length);
            }
        }
    }

    return { rooms, passages, grid };
}

function getNeighbors(room: Room, rooms: Record<number, Room>, passages: Passage[]): Room[] {
    const neighbors: Room[] = [];
    for (const passage of passages) {
        const otherId = passage.getOtherRoom(room.ID);
        if (otherId !== null) {
            const neighbor = rooms[otherId];
            if (neighbor) neighbors.push(neighbor);
        }
    }
    return neighbors;
}

function getNeighborsOfType(room: Room, rooms: Record<number, Room>, passages: Passage[], type: ERoomType): Room[] {
    return getNeighbors(room, rooms, passages).filter((n) => n.Type === type);
}

function isAdjacentToSpecial(room: Room, rooms: Record<number, Room>, passages: Passage[]): boolean {
    for (const neighbor of getNeighbors(room, rooms, passages)) {
        if (neighbor.Type !== ERoomType.NORMAL) return true;
    }
    return false;
}

function AssignRoomTypes(rooms: Record<number, Room>, passages: Passage[], rng: MulberryRNG): number {
    const roomIds = Object.keys(rooms).map(Number);
    if (roomIds.length === 0) return 0;

    const totalRooms = roomIds.length;

    function bfsDistances(startId: number): Map<number, number> {
        const dist = new Map<number, number>();
        const queue: { id: number; depth: number }[] = [{ id: startId, depth: 0 }];
        dist.set(startId, 0);
        while (queue.length > 0) {
            const current = queue.shift()!;
            for (const passage of passages) {
                const otherId = passage.getOtherRoom(current.id);
                if (otherId !== null && !dist.has(otherId)) {
                    dist.set(otherId, current.depth + 1);
                    queue.push({ id: otherId, depth: current.depth + 1 });
                }
            }
        }
        return dist;
    }

    function bfsFarthest(startId: number): { id: number; dist: number } {
        const dist = bfsDistances(startId);
        let farthestId = startId;
        let maxDist = 0;
        for (const [id, d] of dist) {
            if (d > maxDist) {
                maxDist = d;
                farthestId = id;
            }
        }
        return { id: farthestId, dist: maxDist };
    }

    const first = bfsFarthest(roomIds[0]!);
    const second = bfsFarthest(first.id);
    const diameter = second.dist;

    let startId: number;
    let bossId: number;
    if (first.id < second.id) {
        startId = first.id;
        bossId = second.id;
    } else {
        startId = second.id;
        bossId = first.id;
    }

    const startRoom = rooms[startId]!;
    const bossRoom = rooms[bossId]!;
    startRoom.setRoomType(ERoomType.GRACE);
    bossRoom.setRoomType(ERoomType.BOSS);

    const distFromStart = bfsDistances(startId);
    for (const id of roomIds) {
        const room = rooms[id]!;
        room.setDistanceBonus(distFromStart.get(id) ?? 0);
    }

    if (totalRooms < 2) return startId;

    const sorted = [...roomIds]
        .map((id) => rooms[id]!)
        .filter((r) => r.Type === ERoomType.NORMAL)
        .sort((a, b) => a.DistanceBonus - b.DistanceBonus);

    const depths = sorted.map((r) => r.DistanceBonus);
    const minDepth = depths[0] ?? 0;
    const maxDepth = depths[depths.length - 1] ?? 0;
    const depthRange = maxDepth - minDepth;
    const bossDepth = bossRoom.DistanceBonus;
    const minPlacementDepth = 2;
    const bossExclusionDepth = bossDepth - 2;

    function pickAtDepth(targetDepth: number): Room | null {
        let best: Room | null = null;
        let bestDist = Infinity;
        for (const r of sorted) {
            if (r.Type !== ERoomType.NORMAL) continue;
            if (r.DistanceBonus < minPlacementDepth) continue;
            if (r.DistanceBonus > bossExclusionDepth) continue;
            const dist = Math.abs(r.DistanceBonus - targetDepth);
            if (dist < bestDist) {
                bestDist = dist;
                best = r;
            }
        }
        return best;
    }

    const minibossCount = Math.max(1, Math.floor(totalRooms * 0.08));
    const graceCount = Math.max(1, Math.floor(totalRooms * 0.08));
    const treasureCount = Math.max(1, Math.floor(totalRooms * 0.08));

    const minibosses: Room[] = [];
    if (minibossCount > 0 && depthRange > 0) {
        const validMin = Math.max(minDepth, minPlacementDepth);
        const validMax = Math.min(maxDepth, bossExclusionDepth);
        const validRange = validMax - validMin;
        const midDepth = (validMin + validMax) / 2;
        if (validRange > 0) {
            const blockedIds = new Set<number>([startRoom.ID, bossRoom.ID]);
            for (let i = 0; i < minibossCount; i++) {
                const r1 = rng.roll(0, validRange);
                const r2 = rng.roll(0, validRange);
                const target = validMin + (r1 + r2) / 2;
                let best: Room | null = null;
                let bestDist = Infinity;
                for (const r of sorted) {
                    if (r.Type !== ERoomType.NORMAL || blockedIds.has(r.ID)) continue;
                    if (r.DistanceBonus < validMin || r.DistanceBonus > validMax) continue;
                    const dist = Math.abs(r.DistanceBonus - target);
                    if (dist < bestDist) {
                        bestDist = dist;
                        best = r;
                    }
                }
                if (best) {
                    best.setRoomType(ERoomType.MINIBOSS);
                    blockedIds.add(best.ID);
                    for (const n of getNeighbors(best, rooms, passages)) blockedIds.add(n.ID);
                    minibosses.push(best);
                }
            }
        }
    }

    let gracePlaced = 1;
    const graceBlockedIds = new Set<number>([startRoom.ID, bossRoom.ID]);
    for (const mb of minibosses) {
        graceBlockedIds.add(mb.ID);
        for (const n of getNeighbors(mb, rooms, passages)) graceBlockedIds.add(n.ID);
    }

    const bossNeighbors = getNeighborsOfType(bossRoom, rooms, passages, ERoomType.NORMAL)
        .filter((n) => !graceBlockedIds.has(n.ID) && n.DistanceBonus >= minPlacementDepth && n.DistanceBonus <= bossExclusionDepth);
    if (bossNeighbors.length > 0) {
        const beforeBoss = bossNeighbors.sort((a, b) => a.DistanceBonus - b.DistanceBonus)[0]!;
        if (beforeBoss.Type === ERoomType.NORMAL) {
            beforeBoss.setRoomType(ERoomType.GRACE);
            graceBlockedIds.add(beforeBoss.ID);
            for (const n of getNeighbors(beforeBoss, rooms, passages)) graceBlockedIds.add(n.ID);
            gracePlaced++;
        }
    }

    const remainingGrace = graceCount - gracePlaced;
    if (remainingGrace > 0 && depthRange > 0) {
        const step = depthRange / (remainingGrace + 1);
        for (let i = 1; i <= remainingGrace; i++) {
            const target = minDepth + step * i;
            let bestGrace: Room | null = null;
            let bestDist = Infinity;
            for (const r of sorted) {
                if (r.Type !== ERoomType.NORMAL || graceBlockedIds.has(r.ID)) continue;
                const dist = Math.abs(r.DistanceBonus - target);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestGrace = r;
                }
            }
            if (bestGrace) {
                bestGrace.setRoomType(ERoomType.GRACE);
                graceBlockedIds.add(bestGrace.ID);
                for (const n of getNeighbors(bestGrace, rooms, passages)) graceBlockedIds.add(n.ID);
                gracePlaced++;
            }
        }
    }

    const treasurePlaced = sorted.filter((r) => r.Type === ERoomType.TREASURE).length;
    const remainingTreasure = treasureCount - treasurePlaced;
    if (remainingTreasure > 0 && depthRange > 0) {
        const step = depthRange / (remainingTreasure + 1);
        for (let i = 1; i <= remainingTreasure; i++) {
            const target = minDepth + step * i;
            const room = pickAtDepth(target);
            if (room && room.Type === ERoomType.NORMAL) {
                room.setRoomType(ERoomType.TREASURE);
            }
        }
    }

    const puzzleCount = Math.max(0, Math.floor(totalRooms * 0.05));
    if (puzzleCount > 0 && depthRange > 0) {
        const midMin = Math.max(minDepth + depthRange * 0.3, minPlacementDepth);
        const midMax = Math.min(minDepth + depthRange * 0.7, bossExclusionDepth);
        const puzzleCandidates = sorted.filter(
            (r) => r.Type === ERoomType.NORMAL && r.DistanceBonus >= midMin && r.DistanceBonus <= midMax,
        );
        const step = depthRange / (puzzleCount + 1);
        for (let i = 1; i <= puzzleCount && puzzleCandidates.length > 0; i++) {
            const target = minDepth + step * i;
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let j = 0; j < puzzleCandidates.length; j++) {
                const dist = Math.abs(puzzleCandidates[j]!.DistanceBonus - target);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = j;
                }
            }
            const chosen = puzzleCandidates[bestIdx]!;
            chosen.setRoomType(ERoomType.PUZZLE);
            puzzleCandidates.splice(bestIdx, 1);
        }
    }

    return startId;
}

function SpawnSecretRooms(
    rooms: Record<number, Room>,
    passages: Passage[],
    grid: Map<string, Room>,
    rng: MulberryRNG,
    secretCount: number,
): void {
    if (secretCount <= 0) return;

    const roomIds = Object.keys(rooms).map(Number);
    const allRooms = roomIds.map((id) => rooms[id]!).filter((r) => r.Type === ERoomType.NORMAL && !isAdjacentToSpecial(r, rooms, passages));
    if (allRooms.length === 0) return;

    const depths = allRooms.map((r) => r.DistanceBonus);
    const minDepth = Math.min(...depths);
    const maxDepth = Math.max(...depths);
    const validRange = maxDepth - minDepth;
    const midDepth = (minDepth + maxDepth) / 2;

    const usedHostIds = new Set<number>();
    let nextId = Math.max(...roomIds) + 1;

    for (let i = 0; i < secretCount; i++) {
        const r1 = rng.roll(0, validRange);
        const r2 = rng.roll(0, validRange);
        const target = minDepth + (r1 + r2) / 2;

        let bestHost: Room | null = null;
        let bestDist = Infinity;
        for (const r of allRooms) {
            if (usedHostIds.has(r.ID)) continue;
            const dist = Math.abs(r.DistanceBonus - target);
            if (dist < bestDist) {
                bestDist = dist;
                bestHost = r;
            }
        }
        if (!bestHost) break;

        const gridPos = findGridPos(grid, bestHost.ID);
        if (!gridPos) break;

        let placed = false;
        for (const dir of DIRECTIONS) {
            const nx = gridPos.x + OFFSETS[dir].dx;
            const ny = gridPos.y + OFFSETS[dir].dy;
            const nKey = `${nx},${ny}`;
            if (grid.has(nKey)) continue;

            const secretRoom = new Room(nextId);
            rooms[nextId] = secretRoom;
            grid.set(nKey, secretRoom);
            linkRooms(bestHost, secretRoom, dir, passages, passages.length);
            secretRoom.setRoomType(ERoomType.SECRET);
            secretRoom.setDistanceBonus(bestHost.DistanceBonus + 1);
            nextId++;
            usedHostIds.add(bestHost.ID);
            placed = true;
            break;
        }
        if (!placed) break;
    }
}

function findGridPos(grid: Map<string, Room>, roomId: number): { x: number; y: number } | null {
    for (const [key, room] of grid) {
        if (room.ID === roomId) {
            const parts = key.split(",");
            return { x: Number(parts[0]), y: Number(parts[1]) };
        }
    }
    return null;
}

function GeneratePassageEvents(rng: MulberryRNG, passages: Passage[], rooms: Record<number, Room>): void {
    for (const passage of passages) {
        const roomA = rooms[passage.roomA];
        const roomB = rooms[passage.roomB];
        if (!roomA || !roomB) continue;

        const maxDepth = Math.max(roomA.DistanceBonus, roomB.DistanceBonus);

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

function createPassageEvent(rng: MulberryRNG, difficulty: number): IPassageEvent {
    const type = rng.pick(EVENT_TYPES);
    const possibleStats = EVENT_STATS[type] ?? ["strength"];
    const requiredStat = rng.pick(possibleStats);
    return { type, requiredStat, difficulty };
}

function linkRooms(a: Room, b: Room, dir: Direction, passages: Passage[], passageId: number): void {
    const passage = new Passage(passageId, a.ID, b.ID, dir);
    a.setAdjacentPassage(dir, passage);
    b.setAdjacentPassage(OPPOSITE[dir], passage);
    passages.push(passage);
}

function linkIfAbsent(a: Room, b: Room, dir: Direction, passages: Passage[], passageId: number): void {
    if (a.adjacentPassages[dir] === null && b.adjacentPassages[OPPOSITE[dir]] === null) {
        linkRooms(a, b, dir, passages, passageId);
    }
}
