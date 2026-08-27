import z from "zod";
import { ZDmRoomView } from "./room.js";

export const ZDmGameEvent = z.object({
    previous: ZDmRoomView,
    after: ZDmRoomView,
    verb: z.string().optional(),
    target: z.string().optional(),
    detail: z.string().optional(),
});

export type DmGameEvent = z.infer<typeof ZDmGameEvent>;