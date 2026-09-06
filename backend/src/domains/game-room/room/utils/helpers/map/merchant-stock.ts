import { ERoomType, MulberryRNG, rollLoot } from "../../../../../procedural-engine/index.js";
import { IItem } from "../../../../../procedural-engine/item/base.js";
import { getConsumableById } from "../../../../../procedural-engine/item/data/consumables.js";
import { IMerchantDetails } from "../../../types.js";
import { toItem } from "../../../../player/defaults.js";

const MERCHANT_STOCK = new Map<string, IItem[]>();

export function clearMerchantStock(): void {
    MERCHANT_STOCK.clear();
}

function groupStock(raw: IItem[]) {
    const groups = new Map<string, { item: IItem; count: number }>();
    for (const item of raw) {
        const existing = groups.get(item.id);
        if (existing) {
            existing.count++;
        } else {
            groups.set(item.id, { item, count: 1 });
        }
    }
    return Array.from(groups.values()).map(({ item, count }) => toItem(item, count));
}

export function getMerchantStock(seed: string, roomId: number, roomType: string, floor: number): IMerchantDetails {
    if (roomType !== ERoomType.GRACE) {
        return { stock: [], available: false };
    }

    const key = `${seed}-${roomId}`;
    if (MERCHANT_STOCK.has(key)) {
        return { stock: groupStock(MERCHANT_STOCK.get(key)!), available: true };
    }

    const rng = MulberryRNG.fromSeed(seed + roomId);
    const stock: IItem[] = [];

    const healthPotion = getConsumableById("health_potion");
    if (healthPotion) {
        stock.push(healthPotion);
        stock.push(healthPotion);
        stock.push(healthPotion);
    }

    const itemCount = 6 + floor * 2;

    for (let i = 0; i < itemCount; i++) {
        const loot = rollLoot(ERoomType.TREASURE, floor, rng);
        stock.push(...loot.items);
    }

    MERCHANT_STOCK.set(key, stock);
    return { stock: groupStock(stock), available: true };
}

export function removeMerchantItem(seed: string, roomId: number, itemId: string): IItem | null {
    const key = `${seed}-${roomId}`;
    const stock = MERCHANT_STOCK.get(key);
    if (!stock) return null;
    const idx = stock.findIndex((i) => i.id === itemId);
    if (idx === -1) return null;
    return stock.splice(idx, 1)[0] ?? null;
}
