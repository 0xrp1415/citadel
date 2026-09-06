import { generateMap, IMap, IMapConfig, IItem, IRoomMetadata, MulberryRNG } from "../../procedural-engine/index.js";
import { IMapPublicJSON } from "./types.js";
import { IGameRoomMapContext } from "./utils/interface/index.js";
import { IGameRoomConfig } from "./utils/types.js";
import { serializeMap } from "./utils/helpers/map/serialize.js";

const ROOM_COUNT_PRESET = {
    small: { min: 10, max: 15, secrets: 1 },
    medium: { min: 25, max: 30, secrets: 2 },
    large: { min: 35, max: 40, secrets: 4 },
}

const DIFFICULTY_RANK = {
    easy: 1,
    medium: 2,
    hard: 3,
} as const;

export class GameRoomMap implements IGameRoomMapContext {
    private rng: MulberryRNG | null = null;
    private seed: string = "";
    private map: IMap | null = null;
    private floor: number = 1;
    private currentRoomIndex: number = 0;
    private visitedRooms: Set<number> = new Set();
    private clearedRooms: Set<number> = new Set();

    public GenerateMap(config: IGameRoomConfig): void {
        if (!this.rng) {
            this.seed = config.seed;
            this.rng = MulberryRNG.fromSeed(config.seed);
        }

        this.map = generateMap(this.rng, this.RoomConfigToMapConfig(config), this.floor);
        this.currentRoomIndex = this.map.startRoomIndex;
    }

    public ResetMap(): void {
        this.map = null;
        this.rng = null;
        this.seed = "";
        this.floor = 1;
        this.currentRoomIndex = 0;
        this.visitedRooms = new Set();
        this.clearedRooms = new Set();
    }

    public NextFloor(config: IGameRoomConfig): void {
        this.floor++;
        this.GenerateMap(config);
    }

    public Travel(direction: "north" | "south" | "east" | "west"): number | null {
        const currentRoom = this.CurrentRoom;
        if (!currentRoom) return null;

        const passage = currentRoom.exits[direction];
        if (!passage || !passage.Unlocked) return null;

        const targetRoomId = passage.getOtherRoom(currentRoom.id);
        if (targetRoomId === null) return null;

        this.EnterRoom(targetRoomId);
        return targetRoomId;
    }

    public EnterRoom(targetRoomIndex: number): void {
        this.currentRoomIndex = targetRoomIndex;
        this.visitedRooms.add(targetRoomIndex);
        this.UnlockEventless();
    }

    public MarkRoomCleared(targetRoomIndex?: number): void {
        this.clearedRooms.add(targetRoomIndex ?? this.currentRoomIndex);
    }

    public IsRoomCleared(targetRoomIndex: number): boolean {
        return this.clearedRooms.has(targetRoomIndex);
    }

    public CreateRng(): MulberryRNG {
        if (!this.seed) throw new Error("Cannot create RNG before map is generated");
        return MulberryRNG.fromSeed(this.seed);
    }

    public DropItems(items: IItem[]): void {
        const room = this.CurrentRoom;
        if (!room) return;
        room.droppedItems.push(...items);
    }

    public PickupItem(itemIndex: number): IItem | null {
        const room = this.CurrentRoom;
        if (!room || itemIndex < 0 || itemIndex >= room.droppedItems.length) return null;
        return room.droppedItems.splice(itemIndex, 1)[0] ?? null;
    }

    public UnlockEventless(): void {
        const room = this.CurrentRoom;
        if (!room) return;

        for (const dir of ["north", "south", "east", "west"] as const) {
            const passage = room.exits[dir];
            if (passage && !passage.Unlocked && passage.Event === null) {
                passage.unlock();
            }
        }
    }

    private RoomConfigToMapConfig(config: IGameRoomConfig): IMapConfig {
        let room_count = ROOM_COUNT_PRESET[config.mapSize];
        return {
            maxRoomCount: room_count.max,
            minRoomCount: room_count.min,
            dificulty: DIFFICULTY_RANK[config.difficulty],
            secretCount: room_count.secrets,
        };
    }





    // Getters
    public get Map(): IMap | null {
        return this.map;
    }

    public get Floor(): number {
        return this.floor;
    }

    public get VisitedRooms(): Set<number> {
        return this.visitedRooms;
    }

    public get CurrentRoomIndex(): number {
        return this.currentRoomIndex;
    }

    public get CurrentRoom(): IRoomMetadata | null {
        if (!this.map) return null;
        return this.map.rooms[this.currentRoomIndex] || null;
    }

    public get JSON(): IMapPublicJSON | null {
        return this.map ? serializeMap(this.map, this.currentRoomIndex, this.visitedRooms) : null;
    }
}
