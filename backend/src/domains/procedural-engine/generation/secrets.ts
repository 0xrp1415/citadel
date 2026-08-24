import { MulberryRNG } from "../rng.js";
import { Passage } from "../passage.js";
import { ERoomType, Room } from "../room.js";
import { linkRooms } from "./connect.js";
import { Grid, DIRECTIONS, OFFSETS, coordKey, findGridPos } from "./grid.js";
import { NeighborIndex, findClosestToDepth, isAdjacentToSpecial } from "./graph.js";

export function spawnSecretRooms(
    rooms: Record<number, Room>,
    passages: Passage[],
    grid: Grid,
    neighbors: NeighborIndex,
    rng: MulberryRNG,
    secretCount: number,
): void {
    if (secretCount <= 0) return;

    const roomIds = Object.keys(rooms).map(Number);
    const hosts = roomIds
        .map((id) => rooms[id]!)
        .filter((r) => r.Type === ERoomType.NORMAL && !isAdjacentToSpecial(r, neighbors));
    if (hosts.length === 0) return;

    const depths = hosts.map((r) => r.DistanceBonus);
    const minDepth = Math.min(...depths);
    const maxDepth = Math.max(...depths);
    const validRange = maxDepth - minDepth;

    const usedHostIds = new Set<number>();
    let nextId = Math.max(...roomIds) + 1;

    for (let i = 0; i < secretCount; i++) {
        const r1 = rng.roll(0, validRange);
        const r2 = rng.roll(0, validRange);
        const target = minDepth + (r1 + r2) / 2;

        const availableHosts = hosts.filter((r) => !usedHostIds.has(r.ID));
        const bestHost = findClosestToDepth(availableHosts, target);
        if (!bestHost) break;

        const gridPos = findGridPos(grid, bestHost.ID);
        if (!gridPos) break;

        let placed = false;
        for (const dir of DIRECTIONS) {
            const nKey = coordKey(gridPos.x + OFFSETS[dir].dx, gridPos.y + OFFSETS[dir].dy);
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
