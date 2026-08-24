import { Passage } from "../passage.js";
import { ERoomType, Room } from "../room.js";

export type NeighborIndex = Map<number, Room[]>;

export function buildNeighborIndex(rooms: Record<number, Room>, passages: Passage[]): NeighborIndex {
    const index: NeighborIndex = new Map();
    for (const id of Object.keys(rooms).map(Number)) {
        index.set(id, []);
    }
    for (const passage of passages) {
        const roomA = rooms[passage.RoomA];
        const roomB = rooms[passage.RoomB];
        if (!roomA || !roomB) continue;
        index.get(roomA.ID)!.push(roomB);
        index.get(roomB.ID)!.push(roomA);
    }
    return index;
}

export function bfsDistances(neighbors: NeighborIndex, startId: number): Map<number, number> {
    const dist = new Map<number, number>([[startId, 0]]);
    const queue: number[] = [startId];
    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const currentDepth = dist.get(currentId)!;
        for (const neighbor of neighbors.get(currentId) ?? []) {
            if (!dist.has(neighbor.ID)) {
                dist.set(neighbor.ID, currentDepth + 1);
                queue.push(neighbor.ID);
            }
        }
    }
    return dist;
}

export function bfsFarthest(neighbors: NeighborIndex, startId: number): { id: number; dist: number } {
    let farthestId = startId;
    let maxDist = 0;
    for (const [id, d] of bfsDistances(neighbors, startId)) {
        if (d > maxDist) {
            maxDist = d;
            farthestId = id;
        }
    }
    return { id: farthestId, dist: maxDist };
}

export function findClosestToDepth<T extends { ID: number; DistanceBonus: number }>(
    candidates: readonly T[],
    targetDepth: number,
): T | null {
    let best: T | null = null;
    let bestDist = Infinity;
    for (const candidate of candidates) {
        const dist = Math.abs(candidate.DistanceBonus - targetDepth);
        if (dist < bestDist) {
            bestDist = dist;
            best = candidate;
        }
    }
    return best;
}

export function isAdjacentToSpecial(room: Room, neighbors: NeighborIndex): boolean {
    for (const neighbor of neighbors.get(room.ID) ?? []) {
        if (neighbor.Type !== ERoomType.NORMAL) {
            return true;
        }
    }
    return false;
}
