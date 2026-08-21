import { IStats } from "../../procedural-engine/domain.js";
import { ERoomType } from "../../procedural-engine/room.js";
import { ActionResponse, GameRoomState } from "./abstract.js";

const PLAYER_PLAY = "player_play";
const CHANGE_PLAYER_STATS = "CHANGE_PLAYER_STATS";

type TActions = typeof PLAYER_PLAY | typeof CHANGE_PLAYER_STATS;
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

    receivePlayerAction(userId: string, action: TActions, payload?: unknown): ActionResponse {
        switch (action) {
            case CHANGE_PLAYER_STATS:
                const { stat, amount } = payload as { stat: keyof IStats, amount: number };
                return this.handleChangePlayerStats(userId, stat, amount);
            case PLAYER_PLAY:
                return { success: true };
            default:
                return { success: false, error: "Invalid action type for InRunState: " + action };
        }
    }

    private handleChangePlayerStats(userId: string, stat: keyof IStats, amount: number): ActionResponse {
        if (this.gameRoom.CurrentRoom.type !== ERoomType.GRACE) {
            return { success: false, error: "Stat changes can only be made at a grace room." };
        }
        const success = this.gameRoom.changePlayerStatsBy(userId, stat, amount);
        if (!success) {
            return { success: false, error: "Failed to change player stats." };
        }

        return { success: true };
    }
}