import { Direction } from "../passage.js";
import { Room } from "../room.js";

export type Coord = { x: number; y: number };
export type Offset = { dx: number; dy: number };
export type Grid = Map<string, Room>;

export const DIRECTIONS: Direction[] = ["north", "south", "east", "west"];

export const OFFSETS: Record<Direction, Offset> = {
    north: { dx: 0, dy: -1 },
    south: { dx: 0, dy: 1 },
    west: { dx: -1, dy: 0 },
    east: { dx: 1, dy: 0 },
};

export const OPPOSITE: Record<Direction, Direction> = {
    north: "south",
    south: "north",
    west: "east",
    east: "west",
};

export function coordKey(x: number, y: number): string {
    return `${x},${y}`;
}

export function parseCoord(key: string): Coord {
    const parts = key.split(",");
    return { x: Number(parts[0]), y: Number(parts[1]) };
}

export function findGridPos(grid: Grid, roomId: number): Coord | null {
    for (const [key, room] of grid) {
        if (room.ID === roomId) {
            return parseCoord(key);
        }
    }
    return null;
}
