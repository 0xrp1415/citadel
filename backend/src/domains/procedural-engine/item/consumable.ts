import { IBaseItem } from "./base.js";

export interface IConsumable extends IBaseItem {
    type: "consumable";
    equipable: false;
    useable: true;
}