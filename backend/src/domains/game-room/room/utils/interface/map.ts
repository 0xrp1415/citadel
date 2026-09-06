import { IMap, IItem, IRoomMetadata, MulberryRNG } from "../../../../procedural-engine/index.js";
import { IMapPublicJSON } from "../../types.js";
import { IGameRoomConfig } from "../types.js";

export interface IGameRoomMapContext {
    GenerateMap(config: IGameRoomConfig): void;
    NextFloor(config: IGameRoomConfig): void;
    ResetMap(): void;
    Travel(direction: "north" | "south" | "east" | "west"): number | null;
    EnterRoom(targetRoomIndex: number): void;
    UnlockEventless(): void;
    MarkRoomCleared(targetRoomIndex?: number): void;
    IsRoomCleared(targetRoomIndex: number): boolean;
    CreateRng(): MulberryRNG;
    DropItems(items: IItem[]): void;
    PickupItem(itemIndex: number): IItem | null;
    readonly Floor: number;
    readonly CurrentRoomIndex: number;
    readonly CurrentRoom: IRoomMetadata | null;
    readonly VisitedRooms: Set<number>;
    readonly Map: IMap | null;
    readonly JSON: IMapPublicJSON | null;
}
