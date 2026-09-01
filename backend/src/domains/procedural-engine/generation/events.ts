import { MulberryRNG } from "../rng.js";
import { IStats } from "../entity/stats.js";
import { IPassageEvent, Passage, PassageEventType } from "../passage.js";
import { Room } from "../room.js";
import {
    PASSAGE_EVENT_CHANCE_BASE,
    PASSAGE_EVENT_CHANCE_TIERS,
    PASSAGE_EVENT_MAX_DIFFICULTY_DEPTH,
} from "./config.js";

const EVENT_TYPES: readonly PassageEventType[] = ["combat", "puzzle", "challenge"];

const EVENT_STATS: Record<PassageEventType, (keyof IStats)[]> = {
    combat: ["strength", "hp"],
    puzzle: ["intelligence", "wisdom"],
    challenge: ["dexterity", "agility"],
};

const EVENT_FLAVOR_TEXT: Record<keyof IStats, string[]> = {
    strength: [
        "A stone portcullis sinks into the floor, hinges groaning under the weight of a thousand years.",
        "Cracked pillars hold a ceiling of sagging stone; one good shove might bring it down whole.",
        "A colossus of rubble stands between the party and the way ahead, arms braced to block all passage.",
        "The gate-keeper thickens into a wall of braided iron, unyielding, waiting to be met with force.",
    ],
    hp: [
        "A searing ward crawls across the doorway, sapping the vitality of any who draw near.",
        "The barbs of the passage weep a clinging miasma; crossing it will cost blood.",
        "The chamber beyond shudders, its floor studded with teeth that hunger for flesh.",
        "Poisoned air hangs in a green haze, daring the party to hold their breath and endure.",
    ],
    dexterity: [
        "The floor beyond is a field of shifting tiles; one wrong step and the path collapses behind.",
        "Blades sweep the corridor on hidden wires, hungry for a limb to catch.",
        "A narrow bridge of slick stone spans a chasm that gulps at the brave and the reckless alike.",
        "The way narrows into a knife-edge ledge; balance is the only currency that buys passage.",
    ],
    agility: [
        "A collapsing passage demands a burst of speed before the ceiling kisses the floor.",
        "Grinding gears and sweeping pendulums fill the corridor; the only way through is a darting tumble.",
        "A panther-quick shadow—no, a trap—lashes from the dark, testing how fast the party can move.",
        "The floor drops away in sections; only the nimble can spring ahead of the falling stone.",
    ],
    intelligence: [
        "Runes crawl across the sealed door, refusing to spell their meaning until the party deciphers the pattern.",
        "A weight of broken mechanisms waits to be reordered; the lock yields only to understanding.",
        "The gate-keeper gestures to a dial of shifting glyphs—solve its logic or remain on this side.",
        "Carvings spiral the archway, a riddle older than the stones that hold it shut.",
    ],
    wisdom: [
        "The passage is guarded by an aura of false paths; only keen insight may tell true stone from illusion.",
        "A whispering presence tries to steer the party away; steady senses reveal the real gate.",
        "The door hides behind a glamour that muddies sight; it stands open only to those who trust their deeper sense.",
        "An ancient warning hums in the walls; the wise listen, the hasty regret.",
    ],
};

export function generatePassageEvents(rng: MulberryRNG, passages: Passage[], rooms: Record<number, Room>): void {
    for (const passage of passages) {
        const roomA = rooms[passage.RoomA];
        const roomB = rooms[passage.RoomB];
        if (!roomA || !roomB) continue;

        const maxDepth = Math.max(roomA.DistanceBonus, roomB.DistanceBonus);

        let chance = PASSAGE_EVENT_CHANCE_BASE;
        for (const tier of PASSAGE_EVENT_CHANCE_TIERS) {
            if (maxDepth >= tier.minDepth) {
                chance = tier.chance;
            }
        }

        if (rng.chance(chance)) {
            const difficulty = 1 + Math.min(maxDepth, PASSAGE_EVENT_MAX_DIFFICULTY_DEPTH);
            const event = createPassageEvent(rng, difficulty);
            passage.setEvent(event);
        }
    }
}

function createPassageEvent(rng: MulberryRNG, difficulty: number): IPassageEvent {
    const type = rng.pick(EVENT_TYPES);
    const possibleStats = EVENT_STATS[type];
    const requiredStat = rng.pick(possibleStats);
    let flavor_text = rng.pick(EVENT_FLAVOR_TEXT[requiredStat]);
    return { type, requiredStat, difficulty, flavor_text };
}
