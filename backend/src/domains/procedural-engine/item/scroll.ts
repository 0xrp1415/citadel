import { IAbility } from "../ability/interface.js";
import { IBaseItem } from "./base.js";

export interface IScroll extends IBaseItem {
    type: "scroll";
    equipable: true;
    useable: false;
    metadata: IScrollMetadata;
}

export interface IScrollMetadata {
    ability: IAbility;
}