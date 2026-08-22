import { GenerateMap, IMap, IMapConfig, IRoomMetadata, MulberryRNG } from "../../procedural-engine/domain.js";
import { Passage } from "../../procedural-engine/passage.js";
import { IMapPublicJSON, IRoomPublicJSON } from "./types.js";
import { IGameRoomMapContext } from "./utils/interface/index.js";
import { IGameRoomConfig } from "./utils/types.js";

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

        this.map = GenerateMap(this.rng, this.RoomConfigToMapConfig(config));
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

function serializeMap(map: IMap, currentRoomIndex: number): IMapPublicJSON {
    const sortedIds = Object.keys(map.rooms).map(Number).sort((a, b) => a - b);

    const rooms: IRoomPublicJSON[] = sortedIds.map((roomId) => {
        const meta = map.rooms[roomId]!;
        return {
            type: meta.type,
            baseDifficulty: meta.baseDifficulty,
            distanceBonus: meta.distanceBonus,
            isCurrentRoom: roomId === currentRoomIndex,
            exits: deriveExits(roomId, map.passages),
        };
    });

    return { rooms, startRoomIndex: map.startRoomIndex };
}

function deriveExits(roomId: number, passages: Passage[]): IRoomPublicJSON["exits"] {
    const exits: IRoomPublicJSON["exits"] = { left: null, right: null, up: null, down: null };

    for (const passage of passages) {
        if (passage.Direction === null) continue;

        if (passage.roomA === roomId) {
            exits[passage.Direction] = {
                targetRoomId: passage.roomB,
                event: passage.Event,
                unlocked: passage.Unlocked,
            };
        } else if (passage.roomB === roomId) {
            const reverse = OPPOSITE[passage.Direction];
            if (reverse) {
                exits[reverse as keyof IRoomPublicJSON["exits"]] = {
                    targetRoomId: passage.roomA,
                    event: passage.Event,
                    unlocked: passage.Unlocked,
                };
            }
        }
    }

    return exits;
}

const OPPOSITE: Record<string, string> = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
};

