import z from "zod";

export const ZTargetType = z.enum(["enemy", "ally", "object", "self", "location"]);