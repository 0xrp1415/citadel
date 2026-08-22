export interface IGameRoomSocketContext {
    handlePlayerConnect(playerId: string, socketId: string): boolean;
    handlePlayerDisconnect(playerId: string): boolean;
}
