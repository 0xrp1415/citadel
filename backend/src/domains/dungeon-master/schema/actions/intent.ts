import z from "zod";

export const ZActionIntent = z.enum([
    "attack",
    "defend",
    "aid",
    "interact",
    "move",
    "negotiate",
    "use_item",
    "use_ability",
]);