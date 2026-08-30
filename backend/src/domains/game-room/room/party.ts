import { Player, PlayerPublic } from "../player/index.js";
import { IGameRoomPartyContext } from "./utils/interface/index.js";


export class GameRoomParty implements IGameRoomPartyContext {
    private players: Map<string, Player> = new Map();
    private leader: string | null = null;

    
    // Player Management
    public addPlayer(player: Player): Player | null {
        this.players.set(player.Identity.playerId, player);
        if (this.leader === null) {
            this.leader = player.Identity.playerId;
        }
        return player;
    }

    public removePlayer(playerId: string): boolean {
        let result = this.players.delete(playerId);
        if (result && this.leader === playerId) {
            this.leader = this.players.entries().next().value?.[0] || null;
        }
        return result;
    }

    public setLeader(playerId: string): boolean {
        if (this.players.has(playerId)) {
            this.leader = playerId;
            return true;
        }
        return false;
    }

    // Getters
    public getPlayer(playerId: string): Player | undefined {
        return this.players.get(playerId);
    }

    public getPlayerByPublicId(playerPublicId: string): Player | undefined {
        return this.Players.find((p) => p.Identity.playerPublicId === playerPublicId);
    }

    public get Players(): Player[] {
        return Array.from(this.players.values());
    }

    public get PlayerCount(): number {
        return this.players.size;
    }

    public get Leader(): string | null {
        return this.leader;
    }

    public get LeaderPublicId(): string | null {
        const leader = this.leader ? this.players.get(this.leader) : undefined;
        return leader?.Identity.playerPublicId ?? null;
    }

    public get PlayerPublicData() {
        return this.Players.map(player => ({
            ...player.PublicJSON,
        }));
    }

}