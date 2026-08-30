import { IGameRoomBroadcaster, RoomEventType } from "./utils/interface/broadcaster.js";
import { IGameRoomContext } from "./utils/interface/index.js";
import { GameRoomPublicData } from "./types.js";

export class GameRoomBroadcaster implements IGameRoomBroadcaster {
    private readonly context: IGameRoomContext;
    private readonly emit: (type: RoomEventType, data: unknown) => void;
    private lastUpdateTime: number = Date.now();

    constructor(context: IGameRoomContext, emit: (type: RoomEventType, data: unknown) => void) {
        this.context = context;
        this.emit = emit;
    }

    public RoomUpdate(): void {
        this.touch();
        this.emit("game-room-update", this.roomPayload());
    }

    public MessageUpdate(): void {
        this.touch();
        this.emit("message-update", {
            resolverBusy: this.context.DMAdapter.DMState === "active",
            messages: this.context.DMAdapter.DungeonMasterMessages,
        });
    }

    public ConfirmationUpdate(): void {
        this.touch();
        this.emit("confirmation-update", { confirmation: null });
    }

    public LastUpdateTime(): number {
        return this.lastUpdateTime;
    }

    private touch(): void {
        this.lastUpdateTime = Date.now();
    }

    private roomPayload(): GameRoomPublicData {
        return {
            players: this.context.Party.PlayerPublicData,
            totalPlayers: this.context.Party.PlayerCount,
            inviteCode: this.context.Identity.inviteCode,
            config: this.context.Identity.Config,
            status: this.context.StateMachine.CurrentState,
            floor: this.context.Map.Floor,
            currentRoom: this.context.Map.CurrentRoom
                ? { type: this.context.Map.CurrentRoom.type, index: this.context.Map.CurrentRoomIndex }
                : { type: "room", index: this.context.Map.CurrentRoomIndex },
            map: this.context.Map.Map ? this.context.Map.JSON : null,
            hostPublicId: this.context.Party.LeaderPublicId,
        };
    }
}
