import { IGameRoomDungeonMasterAdapter } from "./dm-adapter.js";
import { IGameRoomIdentityContext } from "./identity.js";
import { IGameRoomMapContext } from "./map.js";
import { IGameRoomPartyContext } from "./party.js";
import { IGameRoomSocketContext } from "./socket.js";
import { IGameRoomStateMachineContext } from "./state-machine.js";
import { IGameRoomResolver } from "./resolver.js";
import { IGameRoomBroadcaster } from "./broadcaster.js";

export type { IGameRoomIdentityContext } from "./identity.js";
export type { IGameRoomPartyContext } from "./party.js";
export type { IGameRoomSocketContext } from "./socket.js";
export type { IGameRoomMapContext } from "./map.js";
export type { IGameRoomStateMachineContext } from "./state-machine.js";
export type { IGameRoomDungeonMasterAdapter } from "./dm-adapter.js";
export type { IGameRoomBroadcaster } from "./broadcaster.js";
export type { RoomEventType, MessageUpdatePayload, ConfirmationUpdatePayload } from "./broadcaster.js";

export interface IGameRoomContext {
    readonly Identity: IGameRoomIdentityContext;
    readonly Party: IGameRoomPartyContext;
    readonly Socket: IGameRoomSocketContext;
    readonly Map: IGameRoomMapContext;
    readonly StateMachine: IGameRoomStateMachineContext; 
    readonly DMAdapter: IGameRoomDungeonMasterAdapter;
    readonly Resolver: IGameRoomResolver;
    readonly Broadcaster: IGameRoomBroadcaster;
}
