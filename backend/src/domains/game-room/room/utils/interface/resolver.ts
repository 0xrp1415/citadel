import { DmAction, DmVerdict } from "../../../../dungeon-master/schema/index.js";

export interface IGameRoomResolver {
    Execute(actions: DmAction[], actorId: string): string;
    Ambiguous(verdict: Extract<DmVerdict, { status: "ambiguous" }>): string;
    NotAllowed(reason?: string): string;
}