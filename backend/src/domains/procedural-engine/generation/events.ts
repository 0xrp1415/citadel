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
    return { type, requiredStat, difficulty };
}
