export const SAME_DIRECTION_WEIGHT = 5;
export const TURN_WEIGHT = 2;
export const BACKTRACK_CHANCE = 0.10;
export const EXTRA_LINK_CHANCE = 0.35;

export const SPECIAL_ROOM_RATIO = 0.08;
export const PUZZLE_ROOM_RATIO = 0.05;
export const MIN_PLACEMENT_DEPTH = 2;
export const BOSS_EXCLUSION_OFFSET = 2;

export const PASSAGE_EVENT_CHANCE_BASE = 0.3;
export const PASSAGE_EVENT_CHANCE_TIERS: readonly { minDepth: number; chance: number }[] = [
    { minDepth: 3, chance: 0.4 },
    { minDepth: 5, chance: 0.5 },
];
export const PASSAGE_EVENT_MAX_DIFFICULTY_DEPTH = 3;
