import { GameRoomState } from "../base/index.js";
import { ActionHandler } from "../../utils/types.js";
import { playerConnect, playerDisconnect } from "../base/shared-actions.js";
import { joinPlayer, leavePlayer, kickPlayer } from "./player-actions.js";
import { updateConfig } from "./config-actions.js";
import { toggleReady, startGame, confirmStart } from "./game-flow-actions.js";

export class LobbyState extends GameRoomState {
    protected readonly _id: string = "lobby";

    protected readonly actions: Record<string, ActionHandler> = {
        player_connect:    playerConnect(this.context),
        player_disconnect: playerDisconnect(this.context),
        player_join:        joinPlayer(this.context),
        player_leave:       leavePlayer(this.context),
        kick_player:        kickPlayer(this.context),
        update_config:      updateConfig(this.context),
        player_toggle_ready: toggleReady(this.context),
        start_game:         startGame(this.context),
        confirm_start:      confirmStart(this.context),
    };

    public async onEnterState(): Promise<void> {
        for (const player of this.context.Party.Players) {
            player.status = "connected";
        }
        this.context.Map.ResetMap();
        this.context.Broadcaster.RoomUpdate();
    }

    public async onExitState(): Promise<void> {}
}