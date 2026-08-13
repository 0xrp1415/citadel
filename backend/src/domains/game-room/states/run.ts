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

    receivePlayerAction(userId: string, action: "player_play", payload?: unknown): ActionResponse {
        switch (action) {
            case "player_play":
                return { success: true };
            default:
                return { success: false, error: "Invalid action type for InRunState: " + action };
        }
    }
}