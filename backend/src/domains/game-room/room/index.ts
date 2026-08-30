import { GameRoomPublicData } from "./types.js";
import { GameRoomIdentity } from "./identity.js";
import { GameRoomMap } from "./map.js";
import { GameRoomParty } from "./party.js";
import { GameRoomSocket } from "./socket.js";
import { GameRoomStateMachine } from "./state-machine.js";
import { IGameRoomContext } from "./utils/interface/index.js";
import { IGameRoomIdentity } from "./utils/types.js";
import { LobbyState } from "./states/lobby/index.js";
import { GameRoomDMAdapter } from "./dm-adapter.js";
import { GameRoomResolver } from "./resolver.js";



export class GameRoom implements IGameRoomContext {
    public readonly Identity: GameRoomIdentity;
    public readonly Party: GameRoomParty;
    public readonly Socket: GameRoomSocket;
    public readonly Map: GameRoomMap;
    public readonly StateMachine: GameRoomStateMachine;
    public readonly DMAdapter: GameRoomDMAdapter;
    public readonly Resolver: GameRoomResolver;

    private broadcastFunction: (data: GameRoomPublicData) => void;
    private lastUpdateTime: number = Date.now();

    constructor(identity: IGameRoomIdentity, broadcastFunction: (data: GameRoomPublicData) => void) {
        this.Identity = new GameRoomIdentity(identity);
        this.Party = new GameRoomParty();
        this.Socket = new GameRoomSocket(this.Party, (playerId) => {
            this.Party.removePlayer(playerId);
            this.Broadcast();
        });
        this.Map = new GameRoomMap();
        this.broadcastFunction = broadcastFunction;
        this.StateMachine = new GameRoomStateMachine(new LobbyState(this));
        this.lastUpdateTime = Date.now();
        this.DMAdapter = new GameRoomDMAdapter(this);
        this.Resolver = new GameRoomResolver(this);
        this.StateMachine.StartStateMachine();
    }
    public Broadcast(): void {
        this.broadcastFunction(this.JSON);
        this.lastUpdateTime = Date.now();
    }

    public LastUpdateTime(): number {
        return this.lastUpdateTime;
    }

    public get JSON(): GameRoomPublicData {
        return {
            players: this.Party.PlayerPublicData,
            totalPlayers: this.Party.PlayerCount,
            inviteCode: this.Identity.inviteCode,
            config: this.Identity.Config,
            status: this.StateMachine.CurrentState,
            floor: this.Map.Floor,
            currentRoom: this.Map.CurrentRoom
                ? { type: this.Map.CurrentRoom.type, index: this.Map.CurrentRoomIndex }
                : { type: "room", index: this.Map.CurrentRoomIndex },
            map: this.Map.Map ? this.Map.JSON : null,
            message: this.DMAdapter.DungeonMasterMessages,
            dungeonMasterState: this.DMAdapter.DMState,
        };
    }

}