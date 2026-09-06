import { DmAction, DmVerdict } from "../../../../dungeon-master/schema/index.js";

export interface IGameRoomResolver {
    HandlePlayerAction(action: string, actorId: string): Promise<void>;
    NarrateRoom(description: string): Promise<void>;
    NarrateEncounterOutcome(message: string, opts: { enemiesDead: boolean }): Promise<void>;
    NarrateEndOfRun(): Promise<void>;
    Reset(): void;
    get DungeonMasterMessages(): { from: string, message: string }[];
    get IsBusy(): boolean;
}