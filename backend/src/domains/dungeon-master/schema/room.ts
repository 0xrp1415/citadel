import z from "zod";

export const ZDmPassageEvent = z.object({
    type: z.enum(["combat", "puzzle", "challenge"]),
    requiredStat: z.enum(["hp", "strength", "dexterity", "intelligence", "wisdom", "agility"]),
    difficulty: z.number(),
});

export const ZDmExitSnapshot = z.object({
    targetRoomId: z.number(),
    event: ZDmPassageEvent.nullable(),
    unlocked: z.boolean(),
});

export const ZDmPartyMemberSnapshot = z.object({
    id: z.string(),
    name: z.string(),
    alive: z.boolean(),
    hp: z.number(),
    maxHp: z.number(),
    level: z.number(),
    gold: z.number(),
    consumables: z.object({
        health_potion: z.number(),
        gold_key: z.number(),
        lockpick: z.number(),
    }),
});

export const ZDmRoomView = z.object({
    roomId: z.number(),
    roomType: z.enum(["grace", "normal", "boss", "puzzle", "miniboss", "treasure", "secret"]),
    exits: z.object({
        left: ZDmExitSnapshot.nullable(),
        right: ZDmExitSnapshot.nullable(),
        up: ZDmExitSnapshot.nullable(),
        down: ZDmExitSnapshot.nullable(),
    }),
    party: z.array(ZDmPartyMemberSnapshot),
});

export type DmPassageEvent = z.infer<typeof ZDmPassageEvent>;
export type DmExitSnapshot = z.infer<typeof ZDmExitSnapshot>;
export type DmPartyMemberSnapshot = z.infer<typeof ZDmPartyMemberSnapshot>;
export type DmRoomView = z.infer<typeof ZDmRoomView>;