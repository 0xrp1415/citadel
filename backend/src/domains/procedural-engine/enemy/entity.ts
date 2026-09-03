import { EntityCombat } from "../combat/index.js";
import { IAbility, IAbilityActor } from "../index.js";
import { IEnemyData } from "./interface.js";

export class EnemyEntity extends EntityCombat implements IAbilityActor {
    id: string;
    abilities: IAbility[];
    threatLevel: number;
    name: string;
    description: string;

    constructor(data: IEnemyData) {
        super(data.base_stats, data.base_health, data.stat_multiplier, data.armor_stats, data.weapon_stats, data.ability_stats);
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.abilities = data.abilities;
        this.threatLevel = data.threatLevel;
    }

    get level(): number { return this.threatLevel; }

    get combat(): EntityCombat { return this; }

    ResetHealth(): void {
        this.changeHealthBy(this.Health.MaxHealth);
    }

    get scale_factor(): number { return this.StatMultiplier; }
}
