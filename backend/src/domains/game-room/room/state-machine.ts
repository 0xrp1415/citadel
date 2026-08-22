import { GameRoomState } from "./states/base/index.js";
import { IGameRoomStateMachineContext } from "./utils/interface/state-machine.js";

export class GameRoomStateMachine implements IGameRoomStateMachineContext {
    private state: GameRoomState;

    constructor(initialState: GameRoomState) {
        this.state = initialState;
    }
    
    public StartStaeMachine(): void {
        this.state.onEnterState();
    }
    
    public TransitionTo(newState: GameRoomState): void {
        if (this.state.ID === newState.ID) {
            throw new Error(`Cannot transition to the same state: ${newState.ID}`);
        }

        this.state.onExitState();
        this.state = newState;
        this.state.onEnterState();
    }

    public async DispatchPlayerAction(playerId: string, action: string, payload?: unknown) {
        return await this.state.receivePlayerAction(playerId, action, payload);
    }

    public get CurrentState(): string {
        return this.state.ID;
    }
}