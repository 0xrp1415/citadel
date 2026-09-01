import { IScroll } from "../scroll.js";
import { getAbilityByName } from "../../ability/data/abilities/registry.js";

const scrollAbility = (name: string) => {
    const ability = getAbilityByName(name);
    if (!ability) {
        throw new Error(`No ability named '${name}' for a scroll`);
    }
    return ability;
};

export const SCROLL_ITEMS: IScroll[] = [
    {
        id: "scroll_war_cry",
        name: "Scroll: War Cry",
        description: "A weathered scroll that teaches the reader to bellow a War Cry.",
        stackable: false,
        maxStackQty: 1,
        rarity: { name: "uncommon", rarityLevel: 2 },
        buyPrice: 120,
        type: "scroll",
        equipable: true,
        useable: false,
        metadata: { ability: scrollAbility("War Cry") },
    },
    {
        id: "scroll_mend_wounds",
        name: "Scroll: Mend Wounds",
        description: "A softly glowing scroll holding the Mend Wounds art.",
        stackable: false,
        maxStackQty: 1,
        rarity: { name: "rare", rarityLevel: 3 },
        buyPrice: 250,
        type: "scroll",
        equipable: true,
        useable: false,
        metadata: { ability: scrollAbility("Mend Wounds") },
    },
];