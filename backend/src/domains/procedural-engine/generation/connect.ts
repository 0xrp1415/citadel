import { Direction, Passage } from "../passage.js";
import { Room } from "../room.js";
import { OPPOSITE } from "./grid.js";

export function linkRooms(a: Room, b: Room, dir: Direction, passages: Passage[], passageId: number): void {
    const passage = new Passage(passageId, a.ID, b.ID, dir);
    a.setAdjacentPassage(dir, passage);
    b.setAdjacentPassage(OPPOSITE[dir], passage);
    passages.push(passage);
}

export function linkIfAbsent(a: Room, b: Room, dir: Direction, passages: Passage[], passageId: number): void {
    if (a.adjacentPassages[dir] === null && b.adjacentPassages[OPPOSITE[dir]] === null) {
        linkRooms(a, b, dir, passages, passageId);
    }
}
