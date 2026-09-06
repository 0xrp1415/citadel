import { GameRoomState } from "../base/index.js";
import { ActionHandler } from "../../utils/types.js";
import { RunSummary } from "../../types.js";
import { LobbyState } from "../lobby/index.js";

export class EndRunState extends GameRoomState {
    protected readonly _id: string = "end";

    private readonly acceptedPlayerIds = new Set<string>();

    protected readonly actions: Record<string, ActionHandler> = {
        return_to_lobby: this.returnToLobby(),
    };

    public async onEnterState(): Promise<void> {
        for (const player of this.context.Party.Players) {
            player.status = "ended";
        }

        const summary = this.buildSummary();
        this.context.Broadcaster.SetRunSummary(summary);

        await this.context.Resolver.NarrateEndOfRun();
        this.context.Broadcaster.RoomUpdate();
    }

    public async onExitState(): Promise<void> {}

    public get AcceptedPlayerIds(): string[] {
        return [...this.acceptedPlayerIds];
    }

    private buildSummary(): RunSummary {
        const players = this.context.Party.Players;
        const roomsExplored = this.context.Map.VisitedRooms.size;
        const floor = this.context.Map.Floor;

        let totalXP = 0;
        let totalGold = 0;
        let itemsFound = 0;
        const playerSummaries: RunSummary["players"] = [];

        for (const p of players) {
            const json = p.JSON;
            totalXP += json.experience;
            totalGold += json.gold;
            itemsFound += json.items.length;

            playerSummaries.push({
                name: p.Identity.name,
                kit: p.Kit,
                level: json.level,
                xp: json.experience,
                gold: json.gold,
                health: {
                    CurrentHealth: json.health.CurrentHealth,
                    MaxHealth: json.health.MaxHealth,
                },
                weapon: json.weapon_stats,
                armor: json.armor_stats,
                abilities: json.abilities,
                activeAbilities: json.activeAbilities,
                inventory: json.items,
                base_stats: json.base_stats as unknown as Record<string, number>,
                stat_modifiers: json.stat_modifiers as unknown as Record<string, number>,
            });
        }

        return {
            floor,
            roomsExplored,
            enemiesDefeated: 0,
            totalXP,
            totalGold,
            itemsFound,
            players: playerSummaries,
        };
    }

    private returnToLobby(): ActionHandler {
        return async (playerId) => {
            const player = this.context.Party.getPlayer(playerId);
            if (!player) return { ok: false, status: 404, error: "Player not found" };

            this.acceptedPlayerIds.add(playerId);

            const connectedPlayers = this.context.Party.Players.filter(
                (p) => p.Socket.SocketId !== null,
            );
            const allAccepted = connectedPlayers.every(
                (p) => this.acceptedPlayerIds.has(p.Identity.playerId),
            );

            if (!allAccepted) {
                this.context.Broadcaster.SetAcceptedPlayers([...this.acceptedPlayerIds]);
                this.context.Broadcaster.RoomUpdate();
                return { ok: true, value: null };
            }

            await this.context.StateMachine.TransitionTo(new LobbyState(this.context));
            return { ok: true, value: null };
        };
    }
}
