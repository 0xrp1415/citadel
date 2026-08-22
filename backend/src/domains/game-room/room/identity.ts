import { DEFAULT_GAME_ROOM_CONFIG_GENERATOR } from "./utils/defaults.js";
import { IGameRoomIdentityContext } from "./utils/interface/index.js";
import { IGameRoomConfig, IGameRoomIdentity } from "./utils/types.js";


export class GameRoomIdentity implements IGameRoomIdentityContext {
    public readonly id: string;
    public readonly inviteCode: string;

    private config: IGameRoomConfig;

    constructor({id, inviteCode, defaultConfig} : IGameRoomIdentity) {
        this.id = id;
        this.inviteCode = inviteCode;
        this.config = defaultConfig || DEFAULT_GAME_ROOM_CONFIG_GENERATOR();
    }

    public SetConfig(config: IGameRoomConfig): void {
        this.config = config;
    }

    public get Config(): IGameRoomConfig {
        return this.config;
    }
}