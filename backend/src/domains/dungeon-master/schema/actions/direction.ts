import z from "zod";

export const ZDirection = z.enum(["left", "right", "up", "down"]);