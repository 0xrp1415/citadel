export type TRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface IRarity {
    name: TRarity;
    rarityLevel: number;
}


export interface IBaseItem {
    id: string;
    name: string;
    description: string;

    stackable: boolean;
    maxStackQty: number;

    
    rarity: IRarity;
    buyPrice: number;
}

import { IConsumable } from "./consumable.js";
import { IGear } from "./gear.js";
import { IScroll } from "./scroll.js";

export type IItem = IConsumable | IGear | IScroll;