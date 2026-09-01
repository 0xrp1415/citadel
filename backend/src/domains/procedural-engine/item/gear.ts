import { IGearData } from "../gear/interface.js";
import { IBaseItem } from "./base.js";

export interface IGear extends IBaseItem {
    type: "gear";
    equipable: true;
    useable: false;
    metadata: IGearData;
}
