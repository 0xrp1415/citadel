import { IGameRoomBroadcaster, RoomEventType } from "./utils/interface/broadcaster.js";
import { IGameRoomContext } from "./utils/interface/index.js";
import { GameRoomPublicData, RunSummary } from "./types.js";
import { getMerchantStock } from "./utils/helpers/map/merchant-stock.js";

export class GameRoomBroadcaster implements IGameRoomBroadcaster {
    private readonly context: IGameRoomContext;
    private readonly emit: (type: RoomEventType, data: unknown) => void;
    private lastUpdateTime: number = Date.now();
    private _runSummary: RunSummary | null = null;
    private _acceptedPlayerIds: string[] = [];

    constructor(context: IGameRoomContext, emit: (type: RoomEventType, data: unknown) => void) {
        this.context = context;
        this.emit = emit;
    }

    public SetRunSummary(summary: RunSummary): void {
        this._runSummary = summary;
    }

    public SetAcceptedPlayers(ids: string[]): void {
        this._acceptedPlayerIds = ids;
    }

    public Reset(): void {
        this._runSummary = null;
        this._acceptedPlayerIds = [];
    }

    public RoomUpdate(): void {
        this.touch();
        this.emit("game-room-update", this.roomPayload());
    }

    public MessageUpdate(): void {
        this.touch();
        this.emit("message-update", {
            resolverBusy: this.context.Resolver.IsBusy,
            messages: this.context.Resolver.DungeonMasterMessages,
        });
    }

    public LastUpdateTime(): number {
        return this.lastUpdateTime;
    }

    private touch(): void {
        this.lastUpdateTime = Date.now();
    }

    private roomPayload(): GameRoomPublicData {
        const roomType = this.context.Map.CurrentRoom?.type ?? "normal";
        const merchant = getMerchantStock(
            this.context.Identity.Config.seed,
            this.context.Map.CurrentRoomIndex,
            roomType,
            this.context.Map.Floor,
        );

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
            encounter: this.context.Encounter.State,
            merchantDetails: merchant.available ? merchant : null,
            currentVote: this.context.Vote.CurrentVote,
            runSummary: this._runSummary,
            acceptedPlayerIds: this._acceptedPlayerIds,
        };
    }
}
