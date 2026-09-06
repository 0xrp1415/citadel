import { IItem } from "../base.js";
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