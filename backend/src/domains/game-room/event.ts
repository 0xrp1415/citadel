import { EventEmitter } from "node:events"

export class GameRoomEventBus {
    private emitter = new EventEmitter();
    private static _instance: GameRoomEventBus | null = null;


    public emitEvent<TData>(to: string, event_name: string, data: TData) {
        this.emitter.emit(`room-${event_name}`, { to, data })
    }

    public on<TData extends object>(event: string, handler: (data: { to: string, data: TData }) => void): void {
        this.emitter.on(`room-${event}`, handler);
    }

    public static get Instance() {
        if (!this._instance)
            this._instance = new GameRoomEventBus();
        return this._instance
    }
}