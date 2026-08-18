import { IStats } from "../../procedural-engine/domain.js";
import { PlayerRunEntityRace } from "../player.js";
import { ActionResponse, GameRoomState } from "./abstract.js";
import { InRunState } from "./run.js";

const START_GAME = "start_game";
const PLAYER_TOGGLE_READY = "player_toggle_ready";
const CONFIRM_START = "confirm_start";
const SET_PLAYER_RACE = "SET_PLAYER_RACE";
const CHANGE_PLAYER_STATS = "CHANGE_PLAYER_STATS";

type TActions = typeof START_GAME | typeof PLAYER_TOGGLE_READY | typeof CONFIRM_START | typeof SET_PLAYER_RACE | typeof CHANGE_PLAYER_STATS;

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
            case SET_PLAYER_RACE:
                return this.handleSetPlayerRace(userId, payload as PlayerRunEntityRace);
            case CHANGE_PLAYER_STATS:
                const { stat, amount } = payload as { stat: keyof IStats, amount: number };
                return this.handleChangePlayerStats(userId, stat, amount);

            default:
                return { success: false, error: "Invalid action type for LobbyState: " + action };
        }
    }

    private handlePlayerToggleReady(userId: string): ActionResponse {
        let player = this.gameRoom.getPlayer(userId);
        if (!player) {
            return { success: false, error: "Player not found" };
        }

        if (player.userId === this.gameRoom.Host) {
            return { success: false, error: "Host cannot toggle ready status" };
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

        return this.validateAndStart(userId);
    }

    private handleConfirmStart(userId: string): ActionResponse {
        if (userId !== this.gameRoom.Host)
            return { success: false, error: "Only the host can start the game." };

        const hostPlayer = this.gameRoom.getPlayer(this.gameRoom.Host);
        if (hostPlayer && hostPlayer.socketId === null) {
            return { success: false, error: "Host is disconnected." };
        }

        const ghosts = this.gameRoom.Players.filter(
            (player) => player.socketId === null && player.userId !== this.gameRoom.Host,
        );

        if (ghosts.length === 0) {
            return { success: false, error: "No disconnected players to remove." };
        }

        for (const ghost of ghosts) {
            this.gameRoom.removePlayer(ghost.userId);
        }

        return this.validateAndStart(userId);
    }

    private validateAndStart(userId: string): ActionResponse {
        if (this.gameRoom.Players.length > this.gameRoom.Config.maxPlayers) {
            return { success: false, error: "Too many players in the room." };
        }

        const allReady = this.gameRoom.Players.every(
            (player) => player.status === "ready" || player.userId === this.gameRoom.Host,
        );

        if (!allReady) {
            const disconnected = this.gameRoom.Players.filter(
                (player) => player.socketId === null && player.userId !== this.gameRoom.Host,
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

        if (hostPlayer && hostPlayer.socketId === null) {
            return { success: false, error: "Host is disconnected." };
        }

        this.gameRoom.resetRun();
        this.gameRoom.setState(new InRunState(this.gameRoom));

        return { success: true };
    }

    private handleSetPlayerRace(userId: string, payload?: PlayerRunEntityRace): ActionResponse {
        if (!payload || !["elf", "dwarf", "human", "orc", "goblin", "troll"].includes(payload)) {
            return { success: false, error: "Invalid payload for setting player race." };
        }

        const success = this.gameRoom.setPlayerRace(userId, payload);

        if (!success) {
            return { success: false, error: "Failed to set player race." };
        }

        return { success: true };
    }

    private handleChangePlayerStats(userId: string, stat: keyof IStats, amount: number): ActionResponse {
        const success = this.gameRoom.changePlayerStatsBy(userId, stat, amount);
        if (!success) {
            return { success: false, error: "Failed to change player stats." };
        }

        return { success: true };
    }
}