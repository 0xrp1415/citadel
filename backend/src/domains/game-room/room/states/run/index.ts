import { GameRoomState } from "../base/index.js";
import { ActionHandler, TResult } from "../../utils/types.js";
import { playerConnect, playerDisconnect } from "../base/shared-actions.js";
import { changePlayerStats } from "./player-actions.js";

export class InRunState extends GameRoomState {
    protected readonly _id: string = "in-run";

    protected readonly actions: Record<string, ActionHandler> = {
        player_connect:    playerConnect(this.context),
        player_disconnect: playerDisconnect(this.context),
        change_player_stats: changePlayerStats(this.context),
        player_play:       () => ({ ok: true, value: null } as TResult<unknown>),
    };

    public onEnterState(): void {
        for (const player of this.context.Party.Players) {
            player.status = "in-run";
        }
        this.context.Map.GenerateMap(this.context.Identity.Config);
        this.context.Broadcast();
    }

    public onExitState(): void {}
}