import z from "zod";

export const ZActionIntent = z.enum([
    "move",
    "rest",
    "use_item"
]);