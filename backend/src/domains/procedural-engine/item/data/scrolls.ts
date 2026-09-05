import { IScroll } from "../scroll.js";
import { allAbilities } from "../../ability/data/abilities/registry.js";

function abilityIdToScrollId(abilityId: string): string {
    return `scroll_${abilityId}`;
}

function abilityToRarity(ability: { minimumLevel: number }): { name: "common" | "uncommon" | "rare" | "epic" | "legendary"; rarityLevel: number } {
    if (ability.minimumLevel <= 2) return { name: "common", rarityLevel: 1 };
    if (ability.minimumLevel <= 4) return { name: "uncommon", rarityLevel: 2 };
    if (ability.minimumLevel <= 7) return { name: "rare", rarityLevel: 3 };
    return { name: "epic", rarityLevel: 4 };
}

function abilityToPrice(ability: { minimumLevel: number }): number {
    return ability.minimumLevel * 60 + 40;
}

function generateScrollForAbility(ability: { id: string; name: string; flavor_text: string; minimumLevel: number }): IScroll {
    const rarity = abilityToRarity(ability);
    return {
        id: abilityIdToScrollId(ability.id),
        name: `Scroll: ${ability.name}`,
        description: `A weathered scroll inscribed with the ${ability.name} art. "${ability.flavor_text}"`,
        stackable: false,
        maxStackQty: 1,
        rarity,
        buyPrice: abilityToPrice(ability),
        type: "scroll",
        equipable: true,
        useable: false,
        metadata: { ability: ability as any },
    };
}

export const SCROLL_ITEMS: IScroll[] = allAbilities().map((a) => generateScrollForAbility(a));
