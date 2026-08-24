import { IMap, IRoomMetadata } from "../../../../procedural-engine/index.js";
import { IMapPublicJSON } from "../../types.js";
import { IGameRoomConfig } from "../types.js";

export interface IGameRoomMapContext {
    GenerateMap(config: IGameRoomConfig): void;
    NextFloor(config: IGameRoomConfig): void;
    ResetMap(): void;
    readonly Floor: number;
    readonly CurrentRoomIndex: number;
    readonly CurrentRoom: IRoomMetadata | null;
    readonly Map: IMap | null;
    readonly JSON: IMapPublicJSON | null;
}
