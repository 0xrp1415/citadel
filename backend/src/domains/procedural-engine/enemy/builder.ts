import { IAbility } from "../ability/interface.js";
import { IEnemyBaseData, IEnemyData } from "./interface.js";
import { EnemyEntity } from "./entity.js";

export function threatMultiplier(threatLevel: number): number {
    return 1 + (threatLevel - 1) * 0.5;
}

export class EnemyEntityBuilder {
    private base: IEnemyBaseData;
    private statMultiplier: number;
    private abilities: IAbility[];

    constructor(base: IEnemyBaseData) {
        this.base = base;
        this.statMultiplier = threatMultiplier(base.threatLevel);
        this.abilities = [];
    }

    withBaseData(base: IEnemyBaseData): this {
        this.base = base;
        this.statMultiplier = threatMultiplier(base.threatLevel);
        return this;
    }

    withStatMultiplier(multiplier: number): this {
        this.statMultiplier = multiplier;
        return this;
    }

    withAbilities(abilities: IAbility[]): this {
        this.abilities = [...abilities];
        return this;
    }

    build(): EnemyEntity {
        return new EnemyEntity({
            ...this.base,
            stat_multiplier: this.statMultiplier,
            abilities: [...this.abilities],
        });
    }
}