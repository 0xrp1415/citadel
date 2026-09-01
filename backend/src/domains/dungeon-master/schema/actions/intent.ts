import z from "zod";

export const ZActionIntent = z.enum([
    "move",
    "rest",
    "use_item",
    "look",
    "use_ability",
    "challenge"
]);