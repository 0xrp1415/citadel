import { Passage } from "./passage.js";

export enum ERoomType {
    GRACE = "grace",
    NORMAL = "normal",
    BOSS = "boss",
    PUZZLE = "puzzle",
    MINIBOSS = "miniboss",
    TREASURE = "treasure",
    SECRET = "secret"
}

export const ROOM_BASE_DIFFICULTY: Record<ERoomType, number> = {
    [ERoomType.GRACE]: 0,
    [ERoomType.NORMAL]: 1,
    [ERoomType.TREASURE]: 2,
    [ERoomType.PUZZLE]: 2,
    [ERoomType.MINIBOSS]: 3,
    [ERoomType.SECRET]: 3,
    [ERoomType.BOSS]: 4,
};

export class Room {
    id: number;
    type: ERoomType = ERoomType.NORMAL;
    baseDifficulty: number = ROOM_BASE_DIFFICULTY[ERoomType.NORMAL];
    distanceBonus: number = 0;

    adjacentPassages: {
        north: Passage | null,
        south: Passage | null,
        east: Passage | null,
        west: Passage | null
    } = { south: null, north: null, east: null, west: null };

    constructor(id: number) {
        this.id = id;
    }

    public setAdjacentPassage(direction: keyof typeof this.adjacentPassages, passage: Passage | null) {
        this.adjacentPassages[direction] = passage;
    }

    public setRoomType(type: ERoomType) {
        this.type = type;
        this.baseDifficulty = ROOM_BASE_DIFFICULTY[type];
    }

    public setDistanceBonus(bonus: number) {
        this.distanceBonus = bonus;
    }

    get ID(): number {
        return this.id;
    }

    get Type(): ERoomType {
        return this.type;
    }

    get BaseDifficulty(): number {
        return this.baseDifficulty;
    }

    get DistanceBonus(): number {
        return this.distanceBonus;
    }

    get AdjacentPassages() {
        return {
            north: this.adjacentPassages.north,
            south: this.adjacentPassages.south,
            east: this.adjacentPassages.east,
            west: this.adjacentPassages.west
        };
    }
}
