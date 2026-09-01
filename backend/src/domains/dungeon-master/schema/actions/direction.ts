import z from "zod";

export const ZDirection = z.enum(["north", "south", "east", "west"]);