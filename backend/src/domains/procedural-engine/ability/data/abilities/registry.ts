import { IAbility } from "../../interface.js";
import {
    AGILITY_ABILITIES,
    DEXTERITY_ABILITIES,
    HP_ABILITIES,
    INTELLIGENCE_ABILITIES,
    STRENGTH_ABILITIES,
    WISDOM_ABILITIES,
} from "./index.js";

const ABILITY_CATALOG: IAbility[] = [
    ...STRENGTH_ABILITIES,
    ...DEXTERITY_ABILITIES,
    ...INTELLIGENCE_ABILITIES,
    ...WISDOM_ABILITIES,
    ...AGILITY_ABILITIES,
    ...HP_ABILITIES,
];

const ABILITY_BY_NAME = new Map<string, IAbility>(
    ABILITY_CATALOG.map((ability) => [ability.name, ability]),
);


export function getAbilityByName(name: string): IAbility | undefined {
    return ABILITY_BY_NAME.get(name);
}

export function allAbilities(): IAbility[] {
    return ABILITY_CATALOG;
}
