import { Direction } from "../passage.js";
import { Room } from "../room.js";

export type Coord = { x: number; y: number };
export type Offset = { dx: number; dy: number };
export type Grid = Map<string, Room>;

export const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

export const OFFSETS: Record<Direction, Offset> = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
};

export const OPPOSITE: Record<Direction, Direction> = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
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
