import { IStats } from "./stats.js";

export type Direction = "up" | "down" | "left" | "right";

export interface IPassageEvent {
    type: string;
    requiredStat: keyof IStats;
    difficulty: number;
}

export interface IPassagePublic {
    get ID(): number;
    get RoomA(): number;
    get RoomB(): number;
    get Direction(): Direction | null;
    get Event(): IPassageEvent | null;
    get Unlocked(): boolean;
}

export class Passage implements IPassagePublic {
    id: number;
    roomA: number;
    roomB: number;
    direction: Direction | null;
    event: IPassageEvent | null = null;
    unlocked: boolean = false;

    constructor(id: number, roomA: number, roomB: number, direction?: Direction) {
        this.id = id;
        this.roomA = roomA;
        this.roomB = roomB;
        this.direction = direction ?? null;
    }

    public getOtherRoom(roomId: number): number | null {
        if (roomId === this.roomA) return this.roomB;
        if (roomId === this.roomB) return this.roomA;
        return null;
    }

    get ID(): number {
        return this.id;
    }

    get RoomA(): number {
        return this.roomA;
    }

    get RoomB(): number {
        return this.roomB;
    }

    get Direction(): Direction | null {
        return this.direction;
    }

    get Event(): IPassageEvent | null {
        return this.event;
    }

    get Unlocked(): boolean {
        return this.unlocked;
    }

    public setEvent(event: IPassageEvent): void {
        this.event = event;
    }

    public unlock(): void {
        this.unlocked = true;
    }
}
