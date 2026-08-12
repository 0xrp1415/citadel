import { ActionResponse, GameRoomState } from "./abstract.js";
import { InRunState } from "./run.js";

const START_GAME = "start_game";
const PLAYER_TOGGLE_READY = "player_toggle_ready";

type TActions = typeof START_GAME | typeof PLAYER_TOGGLE_READY;

export class LobbyState extends GameRoomState<TActions> {
    protected id: string = "lobby";



    onEnterState(): void {
        this.gameRoom.setPlayersStatus("connected");
    }
    onExitState(): void {
    }


    public canJoinRoom(): boolean {
        return true;
    }

    public canChangeConfig(): boolean {
        return true;
    }

    receivePlayerAction(userId: string, action: TActions): ActionResponse {
        switch (action) {
            case START_GAME:
                return this.handleStart(userId);
            case PLAYER_TOGGLE_READY:
                return this.handlePlayerToggleReady(userId);
            default:
                return { success: false, error: "Invalid action type for LobbyState: " + action };
        }
    }

    private handlePlayerToggleReady(userId: string): ActionResponse {
        let player = this.gameRoom.getPlayer(userId);
        if (!player) {
            return { success: false, error: "Player not found" };
        }

        if (player.status === "in-run") {
            return { success: false, error: "Cannot change ready status while in run" };
        }

        if (player.socketId === null) {
            return { success: false, error: "Cannot change ready status while disconnected" };
        }

        
        player.status = player.status === "ready" ? "connected" : "ready";

        return { success: true };
    }

    private handleStart(userId: string): ActionResponse {
        if (userId !== this.gameRoom.Host)
            return { success: false, error: "Only the host can start the game." };

        const allReady = this.gameRoom.Players.every(player => player.status === "ready" || player.userId === this.gameRoom.Host);

        if (!allReady) {
            return { success: false, error: "Not all players are ready." };
        }

        this.gameRoom.setState(new InRunState(this.gameRoom));

        return { success: true };
    }

}