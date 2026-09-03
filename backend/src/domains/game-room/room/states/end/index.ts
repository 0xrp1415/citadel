import { GameRoomState } from "../base/index.js";
import { ActionHandler } from "../../utils/types.js";

export class EndRunState extends GameRoomState {
    protected readonly _id: string = "end";

    protected readonly actions: Record<string, ActionHandler> = {};

    public async onEnterState(): Promise<void> {
        for (const player of this.context.Party.Players) {
            player.status = "ended";
        }
        await this.context.Resolver.NarrateEndOfRun();
        this.context.Broadcaster.RoomUpdate();
    }

    public async onExitState(): Promise<void> {}
}
