import { IGameRoomConfig } from "./types.js";

export const DEFAULT_GAME_ROOM_CONFIG_GENERATOR = (): IGameRoomConfig => ({
    maxPlayers: 4,
    seed: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    difficulty: "medium",
    mapSize: "medium",
});
