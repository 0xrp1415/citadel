import z from "zod";
import { ZAction } from "./actions/index.js";

export const ZDmVerdict = z.discriminatedUnion("status", [
    z.object({
        status: z.literal("execute"),
        actions: z.array(ZAction).min(1).max(6),
    }),
    z.object({ status: z.literal("not_allowed"), reason: z.string().optional() }),
    z.object({
        status: z.literal("ambiguous"),
        question: z.string().optional(),
        guesses: z.array(z.string()).optional(),
    }),
]);

export type DmVerdict = z.infer<typeof ZDmVerdict>;