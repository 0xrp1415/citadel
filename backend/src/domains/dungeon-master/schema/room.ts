import z from "zod";
import { IAbility } from "../../procedural-engine/index.js";
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

export const ZDMPartyMemberAbilitySnapshot = z.object({
    name: z.string(),
    flavor_text: z.string(),
    targeting: z.object({
        kind: z.enum(["enemy", "ally", "self", "any"]),
        scope: z.enum(["single", "all", "self"]),
    })
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
    abilities: z.array(ZDMPartyMemberAbilitySnapshot),
});

export const ZDmRoomView = z.object({
    roomId: z.number(),
    roomType: z.enum(["grace", "normal", "boss", "puzzle", "miniboss", "treasure", "secret"]),
    exits: z.object({
        north: ZDmExitSnapshot.nullable(),
        south: ZDmExitSnapshot.nullable(),
        east: ZDmExitSnapshot.nullable(),
        west: ZDmExitSnapshot.nullable(),
    }),
    party: z.array(ZDmPartyMemberSnapshot),
});

export type DmPassageEvent = z.infer<typeof ZDmPassageEvent>;
export type DmExitSnapshot = z.infer<typeof ZDmExitSnapshot>;
export type DmPartyMemberSnapshot = z.infer<typeof ZDmPartyMemberSnapshot>;
export type DmRoomView = z.infer<typeof ZDmRoomView>;