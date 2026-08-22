import { ActionResponse, GameRoomState } from "./abstract.js";
import { InRunState } from "./run.js";

const START_GAME = "start_game";
const PLAYER_TOGGLE_READY = "player_toggle_ready";
const CONFIRM_START = "confirm_start";

type TActions = typeof START_GAME | typeof PLAYER_TOGGLE_READY | typeof CONFIRM_START;

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

    receivePlayerAction(userId: string, action: TActions, payload?: unknown): ActionResponse {
        switch (action) {
            case START_GAME:
                return this.handleStart(userId);
            case CONFIRM_START:
                return this.handleConfirmStart(userId);
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

        if (player.Identity.userId === this.gameRoom.Host) {
            return { success: false, error: "Host cannot toggle ready status" };
        }

        if (player.status === "in-run") {
            return { success: false, error: "Cannot change ready status while in run" };
        }

        if (player.Socket.SocketId === null) {
            return { success: false, error: "Cannot change ready status while disconnected" };
        }


        player.status = player.status === "ready" ? "connected" : "ready";

        return { success: true };
    }

    private handleStart(userId: string): ActionResponse {
        if (userId !== this.gameRoom.Host)
            return { success: false, error: "Only the host can start the game." };

        return this.validateAndStart(userId);
    }

    private handleConfirmStart(userId: string): ActionResponse {
        if (userId !== this.gameRoom.Host)
            return { success: false, error: "Only the host can start the game." };

        const hostPlayer = this.gameRoom.getPlayer(this.gameRoom.Host);
        if (hostPlayer && hostPlayer.Socket.SocketId === null) {
            return { success: false, error: "Host is disconnected." };
        }

        const ghosts = this.gameRoom.Players.filter(
            (player) => player.Socket.SocketId === null && player.Identity.userId !== this.gameRoom.Host,
        );

        if (ghosts.length === 0) {
            return { success: false, error: "No disconnected players to remove." };
        }

        for (const ghost of ghosts) {
            this.gameRoom.removePlayer(ghost.Identity.userId);
        }

        return this.validateAndStart(userId);
    }

    private validateAndStart(userId: string): ActionResponse {
        if (this.gameRoom.Players.length > this.gameRoom.Config.maxPlayers) {
            return { success: false, error: "Too many players in the room." };
        }

        const allReady = this.gameRoom.Players.every(
            (player) => player.status === "ready" || player.Identity.userId === this.gameRoom.Host,
        );

        if (!allReady) {
            const disconnected = this.gameRoom.Players.filter(
                (player) => player.Socket.SocketId === null && player.Identity.userId !== this.gameRoom.Host,
            ).length;

            return {
                success: false,
                error:
                    disconnected > 0
                        ? `Not all players are ready (${disconnected} disconnected). Use confirm_start to remove them.`
                        : "Not all players are ready.",
            };
        }

        const hostPlayer = this.gameRoom.getPlayer(this.gameRoom.Host);

        if (hostPlayer && hostPlayer.Socket.SocketId === null) {
            return { success: false, error: "Host is disconnected." };
        }

        this.gameRoom.resetRun();
        this.gameRoom.setState(new InRunState(this.gameRoom));

        return { success: true };
    }
}