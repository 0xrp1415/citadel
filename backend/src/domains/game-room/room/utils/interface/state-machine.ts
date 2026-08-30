import { GameRoomState } from "../../states/base/index.js";

export interface IGameRoomStateMachineContext {
    readonly CurrentState: string;
    
    TransitionTo(state: GameRoomState): Promise<void>;
    DispatchPlayerAction(playerId: string, action: string, payload?: unknown): Promise<unknown>;
}