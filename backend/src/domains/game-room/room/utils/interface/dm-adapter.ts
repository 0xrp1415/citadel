import { DmVerdict } from "../../../../dungeon-master/types.js";

export interface IGameRoomDungeonMasterAdapter {
    Resolve(from: string, text: string): Promise<DmVerdict>;
    Narrate(eventText: string): Promise<string>;
}