export class PlayerSocket {
    private _socketId: string | null = null;
    private _disconnectedAt: number = Date.now();

    set SocketId(socketId: string | null) {
        this._socketId = socketId;
        if (socketId === null) {
            this._disconnectedAt = Date.now();
        }
    }

    get SocketId(): string | null {
        return this._socketId;
    }

    get DisconnectedAt(): number {
        return this._disconnectedAt;
    }
}
