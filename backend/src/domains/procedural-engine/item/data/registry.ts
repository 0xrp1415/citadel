import { IItem } from "../base.js";
import { IGear } from "../gear.js";
import { TGearSlot } from "../../gear/interface.js";
import { GEAR_ITEMS } from "./gear.js";
import { SCROLL_ITEMS } from "./scrolls.js";
import { CONSUMABLE_ITEMS } from "./consumables.js";

export const ITEM_CATALOG: IItem[] = [
    ...GEAR_ITEMS,
    ...SCROLL_ITEMS,
    ...CONSUMABLE_ITEMS,
];

const ITEM_BY_ID = new Map<string, IItem>(
    ITEM_CATALOG.map((item) => [item.id, item]),
);

export function getItemById(id: string): IItem | undefined {
    return ITEM_BY_ID.get(id);
}

export function allItems(): IItem[] {
    return ITEM_CATALOG;
}

export function gearBySlot(slot: TGearSlot): IGear[] {
    return ITEM_CATALOG.filter((item): item is IGear => item.type === "gear" && item.metadata.slot === slot);
}