import z from "zod";
import { ZDirection } from "./direction.js";
import { ZActionIntent } from "./intent.js";
import { ZTargetType } from "./target.js";
import { ZResource } from "./resource.js";

export const ZAction = z
    .object({
        intent: ZActionIntent,
        target_type: ZTargetType.optional(),
        target_id: z.string().array().optional(),
        direction: ZDirection.optional(),
        detail: z.string().optional(),
        resource: ZResource.optional(),
    })
    .refine((a) => a.intent !== "move" || !!a.direction, {
        message: "move requires a direction",
    })
    .refine(
        (a) =>
            !(a.intent === "use_item" || a.intent === "use_ability") ||
            !!a.resource?.id,
        { message: "item/ability actions must carry resource.id" },
    );

export type DmAction = z.infer<typeof ZAction>;