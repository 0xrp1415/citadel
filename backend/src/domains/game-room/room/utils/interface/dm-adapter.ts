import { DmVerdict } from "../../../../dungeon-master/types.js";

export interface IGameRoomDungeonMasterAdapter {
    Resolve(from: string, text: string): Promise<DmVerdict>;
    Narrate(from: string, eventText: string): Promise<string>;
    get DMState(): any;
    get DungeonMasterMessages(): { from: string, message: string }[];
}