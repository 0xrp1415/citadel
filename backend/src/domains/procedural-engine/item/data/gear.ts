import { IGear } from "../gear.js";
import { WEAPON_GEAR } from "../../gear/data/weapon.js";
import { HEAD_GEAR } from "../../gear/data/head.js";
import { CHEST_GEAR } from "../../gear/data/chest.js";
import { GREAVES_GEAR } from "../../gear/data/greaves.js";

export const GEAR_ITEMS: IGear[] = [
    ...WEAPON_GEAR,
    ...HEAD_GEAR,
    ...CHEST_GEAR,
    ...GREAVES_GEAR,
];