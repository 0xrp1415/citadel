import { generateMap, IMap, IMapConfig, IRoomMetadata, MulberryRNG } from "../../procedural-engine/index.js";
import { IMapPublicJSON } from "./types.js";
import { IGameRoomMapContext } from "./utils/interface/index.js";
import { IGameRoomConfig } from "./utils/types.js";
import { serializeMap } from "./utils/helpers/map/serialize.js";

const ROOM_COUNT_PRESET = {
    small: { min: 10, max: 15, secrets: 1 },
    medium: { min: 25, max: 30, secrets: 2 },
    large: { min: 35, max: 40, secrets: 4 },
}

export class GameRoomMap implements IGameRoomMapContext {
    private rng: MulberryRNG | null = null;
    private map: IMap | null = null;
    private floor: number = 1;
    private currentRoomIndex: number = 0;

    public GenerateMap(config: IGameRoomConfig): void {
        if (!this.rng)
            this.rng = MulberryRNG.fromSeed(config.seed);

        this.map = generateMap(this.rng, this.RoomConfigToMapConfig(config));
        this.currentRoomIndex = this.map.startRoomIndex;
    }

    public ResetMap(): void {
        this.map = null;
        this.rng = null;
        this.floor = 1;
        this.currentRoomIndex = 0;
    }

    public NextFloor(config: IGameRoomConfig): void {
        this.floor++;
        this.GenerateMap(config);
    }

    private RoomConfigToMapConfig(config: IGameRoomConfig): IMapConfig {
        let room_count = ROOM_COUNT_PRESET[config.mapSize];
        return {
            maxRoomCount: room_count.max,
            minRoomCount: room_count.min,
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

    public get CurrentRoomIndex(): number {
        return this.currentRoomIndex;
    }

    public get CurrentRoom(): IRoomMetadata | null {
        if (!this.map) return null;
        return this.map.rooms[this.currentRoomIndex] || null;
    }

    public get JSON(): IMapPublicJSON | null {
        return this.map ? serializeMap(this.map, this.currentRoomIndex) : null;
    }
}
