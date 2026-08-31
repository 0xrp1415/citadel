import { DmAction, DmVerdict } from "../../../../dungeon-master/schema/index.js";

export interface IGameRoomResolver {
    HandlePlayerAction(action: string, actorId: string): Promise<void>;
    NarrateRoom(description: string): Promise<void>;
    get DungeonMasterMessages(): { from: string, message: string }[];
    get IsBusy(): boolean;
}