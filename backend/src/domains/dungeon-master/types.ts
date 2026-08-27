import type { DmRoomView } from "./schema/room.js";
import type { DmVerdict } from "./schema/verdict.js";

export type { DmVerdict };

export type TRoomViewGenerator = () => Promise<DmRoomView>;

export type TTranscriptEntry = {
    role: "player" | "dm";
    text: string;
};