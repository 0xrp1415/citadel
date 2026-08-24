import { EntityCombat, IStats, sumStats } from "../../procedural-engine/index.js";
import { BASE_MAX_PLAYER_BASE_STAT, BASE_PLAYER_HP } from "./defaults.js";
import { PlayerRunEntityArmors, PlayerRunEntityArmor, PlayerRunEntityWeapon } from "./types.js";

export class PlayerCombat extends EntityCombat {
    private armors: PlayerRunEntityArmors;
    private weapon: PlayerRunEntityWeapon;
    private level: number;

    constructor(
        initialStats: IStats,
        initialArmorStats: PlayerRunEntityArmors,
        initialWeaponStats: PlayerRunEntityWeapon,
        level: number
    ) {
        super(initialStats, BASE_PLAYER_HP, level);
        this.armors = initialArmorStats;
        this.weapon = initialWeaponStats;
        this.level = level;
    }

    public increaseBaseStatBy(stat: keyof IStats, amount: number, level: number = this.level): boolean {
        return super.increaseBaseStatBy(stat, amount, this.getMaxBaseStat(level));
    }

    public setLevel(level: number): void {
        this.level = level;
        this.setStatMultiplier(level);
    }

    public setArmorStatFor(gear: keyof PlayerRunEntityArmors, armorStat: PlayerRunEntityArmor): void {
        this.armors[gear] = armorStat;
    }

    public setWeaponStat(weaponStat: PlayerRunEntityWeapon): void {
        this.weapon = weaponStat;
    }

    public get ArmorStats(): PlayerRunEntityArmors {
        return this.armors;
    }

    public get WeaponStats(): PlayerRunEntityWeapon {
        return this.weapon;
    }

    public get StatChangeByArmor(): IStats {
        return sumStats(Object.values(this.armors).map((armor) => armor.stats));
    }

    public getMaxBaseStat(level: number): number {
        return BASE_MAX_PLAYER_BASE_STAT + (level - 1);
    }
}
