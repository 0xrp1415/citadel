import { ActionResponse, GameRoomState } from "./abstract.js";

type TActions = "player_play";
export class InRunState extends GameRoomState<TActions> {
    protected id: string = "in-run";

    onEnterState(): void {
        this.gameRoom.setPlayersStatus("in-run");
    }

    onExitState(): void {
    }

    public canJoinRoom(): boolean {
        return false;
    }

    public canChangeConfig(): boolean {
        return false;
    }

    receivePlayerAction(userId: string, action: "player_play"): ActionResponse {
        return { success: true };
    }
}