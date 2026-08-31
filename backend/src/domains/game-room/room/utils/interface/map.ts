import { IMap, IRoomMetadata } from "../../../../procedural-engine/index.js";
import { IMapPublicJSON } from "../../types.js";
import { IGameRoomConfig } from "../types.js";

export interface IGameRoomMapContext {
    GenerateMap(config: IGameRoomConfig): void;
    NextFloor(config: IGameRoomConfig): void;
    ResetMap(): void;
    Travel(direction: "left" | "right" | "up" | "down"): number | null;
    EnterRoom(targetRoomIndex: number): void;
    UnlockEventless(): void;
    readonly Floor: number;
    readonly CurrentRoomIndex: number;
    readonly CurrentRoom: IRoomMetadata | null;
    readonly VisitedRooms: Set<number>;
    readonly Map: IMap | null;
    readonly JSON: IMapPublicJSON | null;
}
