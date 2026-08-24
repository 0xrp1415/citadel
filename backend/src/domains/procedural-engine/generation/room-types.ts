import { MulberryRNG } from "../rng.js";
import { ERoomType, Room } from "../room.js";
import {
    BOSS_EXCLUSION_OFFSET,
    MIN_PLACEMENT_DEPTH,
    PUZZLE_ROOM_RATIO,
    SPECIAL_ROOM_RATIO,
} from "./config.js";
import { NeighborIndex, bfsDistances, bfsFarthest, findClosestToDepth } from "./graph.js";

export function assignRoomTypes(rooms: Record<number, Room>, neighbors: NeighborIndex, rng: MulberryRNG): number {
    const roomIds = Object.keys(rooms).map(Number);
    if (roomIds.length === 0) return 0;

    const totalRooms = roomIds.length;

    const first = bfsFarthest(neighbors, roomIds[0]!);
    const second = bfsFarthest(neighbors, first.id);

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

    const distFromStart = bfsDistances(neighbors, startId);
    for (const id of roomIds) {
        rooms[id]!.setDistanceBonus(distFromStart.get(id) ?? 0);
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
    const bossExclusionDepth = bossRoom.DistanceBonus - BOSS_EXCLUSION_OFFSET;

    const minibosses = placeMinibosses(
        rng,
        sorted,
        neighbors,
        startRoom,
        bossRoom,
        totalRooms,
        minDepth,
        maxDepth,
        depthRange,
        bossExclusionDepth,
    );
    placeGraces(sorted, neighbors, startRoom, bossRoom, minibosses, totalRooms, minDepth, depthRange, bossExclusionDepth);
    placeTreasures(sorted, totalRooms, minDepth, depthRange, bossExclusionDepth);
    placePuzzles(sorted, totalRooms, minDepth, depthRange, bossExclusionDepth);

    return startId;
}

function expandBlocked(blocked: Set<number>, room: Room, neighbors: NeighborIndex): void {
    blocked.add(room.ID);
    for (const neighbor of neighbors.get(room.ID) ?? []) {
        blocked.add(neighbor.ID);
    }
}

function placeMinibosses(
    rng: MulberryRNG,
    sorted: Room[],
    neighbors: NeighborIndex,
    startRoom: Room,
    bossRoom: Room,
    totalRooms: number,
    minDepth: number,
    maxDepth: number,
    depthRange: number,
    bossExclusionDepth: number,
): Room[] {
    const minibossCount = Math.max(1, Math.floor(totalRooms * SPECIAL_ROOM_RATIO));
    const minibosses: Room[] = [];
    if (minibossCount <= 0 || depthRange <= 0) {
        return minibosses;
    }

    const validMin = Math.max(minDepth, MIN_PLACEMENT_DEPTH);
    const validMax = Math.min(maxDepth, bossExclusionDepth);
    const validRange = validMax - validMin;
    if (validRange <= 0) {
        return minibosses;
    }

    const blockedIds = new Set<number>([startRoom.ID, bossRoom.ID]);
    for (let i = 0; i < minibossCount; i++) {
        const r1 = rng.roll(0, validRange);
        const r2 = rng.roll(0, validRange);
        const target = validMin + (r1 + r2) / 2;

        const candidates = sorted.filter(
            (r) =>
                r.Type === ERoomType.NORMAL &&
                !blockedIds.has(r.ID) &&
                r.DistanceBonus >= validMin &&
                r.DistanceBonus <= validMax,
        );
        const best = findClosestToDepth(candidates, target);
        if (best) {
            best.setRoomType(ERoomType.MINIBOSS);
            expandBlocked(blockedIds, best, neighbors);
            minibosses.push(best);
        }
    }
    return minibosses;
}

function placeGraces(
    sorted: Room[],
    neighbors: NeighborIndex,
    startRoom: Room,
    bossRoom: Room,
    minibosses: Room[],
    totalRooms: number,
    minDepth: number,
    depthRange: number,
    bossExclusionDepth: number,
): void {
    const graceCount = Math.max(1, Math.floor(totalRooms * SPECIAL_ROOM_RATIO));

    const graceBlockedIds = new Set<number>([startRoom.ID, bossRoom.ID]);
    for (const miniboss of minibosses) {
        expandBlocked(graceBlockedIds, miniboss, neighbors);
    }

    let gracePlaced = 1;

    const bossNeighbors = (neighbors.get(bossRoom.ID) ?? [])
        .filter((n) => n.Type === ERoomType.NORMAL)
        .filter(
            (n) =>
                !graceBlockedIds.has(n.ID) &&
                n.DistanceBonus >= MIN_PLACEMENT_DEPTH &&
                n.DistanceBonus <= bossExclusionDepth,
        )
        .sort((a, b) => a.DistanceBonus - b.DistanceBonus);

    const beforeBoss = bossNeighbors[0];
    if (beforeBoss) {
        beforeBoss.setRoomType(ERoomType.GRACE);
        expandBlocked(graceBlockedIds, beforeBoss, neighbors);
        gracePlaced++;
    }

    const remainingGrace = graceCount - gracePlaced;
    if (remainingGrace > 0 && depthRange > 0) {
        const step = depthRange / (remainingGrace + 1);
        for (let i = 1; i <= remainingGrace; i++) {
            const target = minDepth + step * i;
            const candidates = sorted.filter((r) => r.Type === ERoomType.NORMAL && !graceBlockedIds.has(r.ID));
            const bestGrace = findClosestToDepth(candidates, target);
            if (bestGrace) {
                bestGrace.setRoomType(ERoomType.GRACE);
                expandBlocked(graceBlockedIds, bestGrace, neighbors);
                gracePlaced++;
            }
        }
    }
}

function placeTreasures(
    sorted: Room[],
    totalRooms: number,
    minDepth: number,
    depthRange: number,
    bossExclusionDepth: number,
): void {
    const treasureCount = Math.max(1, Math.floor(totalRooms * SPECIAL_ROOM_RATIO));
    if (treasureCount <= 0 || depthRange <= 0) {
        return;
    }

    const step = depthRange / (treasureCount + 1);
    for (let i = 1; i <= treasureCount; i++) {
        const target = minDepth + step * i;
        const candidates = sorted.filter(
            (r) =>
                r.Type === ERoomType.NORMAL &&
                r.DistanceBonus >= MIN_PLACEMENT_DEPTH &&
                r.DistanceBonus <= bossExclusionDepth,
        );
        const room = findClosestToDepth(candidates, target);
        if (room && room.Type === ERoomType.NORMAL) {
            room.setRoomType(ERoomType.TREASURE);
        }
    }
}

function placePuzzles(
    sorted: Room[],
    totalRooms: number,
    minDepth: number,
    depthRange: number,
    bossExclusionDepth: number,
): void {
    const puzzleCount = Math.max(0, Math.floor(totalRooms * PUZZLE_ROOM_RATIO));
    if (puzzleCount <= 0 || depthRange <= 0) {
        return;
    }

    const midMin = Math.max(minDepth + depthRange * 0.3, MIN_PLACEMENT_DEPTH);
    const midMax = Math.min(minDepth + depthRange * 0.7, bossExclusionDepth);
    const puzzleCandidates = sorted.filter(
        (r) => r.Type === ERoomType.NORMAL && r.DistanceBonus >= midMin && r.DistanceBonus <= midMax,
    );

    const step = depthRange / (puzzleCount + 1);
    for (let i = 1; i <= puzzleCount && puzzleCandidates.length > 0; i++) {
        const target = minDepth + step * i;
        const chosen = findClosestToDepth(puzzleCandidates, target);
        if (!chosen) break;
        chosen.setRoomType(ERoomType.PUZZLE);
        puzzleCandidates.splice(puzzleCandidates.indexOf(chosen), 1);
    }
}
