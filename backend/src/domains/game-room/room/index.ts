import { GameRoomPublicData } from "./types.js";
import { GameRoomIdentity } from "./identity.js";
import { GameRoomMap } from "./map.js";
import { GameRoomParty } from "./party.js";
import { GameRoomSocket } from "./socket.js";
import { GameRoomStateMachine } from "./state-machine.js";
import { IGameRoomContext, RoomEventType } from "./utils/interface/index.js";
import { IGameRoomIdentity } from "./utils/types.js";
import { LobbyState } from "./states/lobby/index.js";
import { GameRoomDMAdapter } from "./dm-adapter.js";
import { GameRoomResolver } from "./resolver.js";
import { GameRoomBroadcaster } from "./broadcaster.js";
import { GameRoomConfirmationManager } from "./confirmation.js";



export class GameRoom implements IGameRoomContext {
    public readonly Identity: GameRoomIdentity;
    public readonly Party: GameRoomParty;
    public readonly Socket: GameRoomSocket;
    public readonly Map: GameRoomMap;
    public readonly StateMachine: GameRoomStateMachine;
    public readonly DMAdapter: GameRoomDMAdapter;
    public readonly Resolver: GameRoomResolver;
    public readonly Broadcaster: GameRoomBroadcaster;
    public readonly Confirmation: GameRoomConfirmationManager;

    constructor(identity: IGameRoomIdentity, emit: (type: RoomEventType, data: unknown) => void) {
        this.Identity = new GameRoomIdentity(identity);
        this.Party = new GameRoomParty();
        this.Socket = new GameRoomSocket(this.Party, (playerId) => {
            this.Party.removePlayer(playerId);
            this.Broadcaster.RoomUpdate();
        });
        this.Map = new GameRoomMap();
        this.Broadcaster = new GameRoomBroadcaster(this, emit);
        this.Confirmation = new GameRoomConfirmationManager(this);
        this.StateMachine = new GameRoomStateMachine(new LobbyState(this));
        this.DMAdapter = new GameRoomDMAdapter(this);
        this.Resolver = new GameRoomResolver(this);
        this.StateMachine.StartStateMachine();
    }

    public LastUpdateTime(): number {
        return this.Broadcaster.LastUpdateTime();
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
            hostPublicId: this.Party.LeaderPublicId,
        };
    }

}