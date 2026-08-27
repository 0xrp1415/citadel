import z from "zod";

export const ZResource = z.object({
    type: z.enum(["item", "spell", "none"]),
    id: z.string().optional(),
});