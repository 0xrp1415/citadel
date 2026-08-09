import { IGameRoomConfig } from "../types.js";
import { IPlayerJSON, IPlayerRoomInstance } from "./player.js";

export class GameRoomContext {
    private config: IGameRoomConfig;

    private lastActivityTimestamp: number = Date.now();
    private players: Map<string, IPlayerRoomInstance> = new Map<string, IPlayerRoomInstance>();

    private isRoomJoinable: boolean = true;
    constructor(config: IGameRoomConfig) {
        this.config = config;
    }

    // Methods to manage the game room context
    
    // Update the last activity timestamp to the current time
    public updateLastActivityTimestamp(): void {
        this.lastActivityTimestamp = Date.now();
    }


    // Methods to manage players in the game room context
    public addPlayer(player: IPlayerRoomInstance): void {
        this.players.set(player.user_id, player);
    }

    public removePlayer(playerId: string): boolean {
        const removed = this.players.delete(playerId);
        return removed;
        
    }

    public getPlayer(playerId: string): IPlayerRoomInstance | undefined {
        return this.players.get(playerId);
    }

    public hasPlayer(playerId: string): boolean {
        return this.players.has(playerId);
    }

    // Handle Room Joinable
    setRoomJoinable(isJoinable: boolean): void {
        this.isRoomJoinable = isJoinable;
    }

  

    // Getters for the game room context
    public get Config(): IGameRoomConfig {
        return this.config;
    }

    public get LastActivityTimestamp(): number {
        return this.lastActivityTimestamp;
    }

    public get Players(){
        return this.players.values();
    }
    
    public get PlayersCount(): number {
        return this.players.size;
    }

    public get IsRoomJoinable(): boolean {
        return this.isRoomJoinable;
    }
}