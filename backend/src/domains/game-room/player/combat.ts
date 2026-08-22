import { EntityHealthStatImpl, EntityStats, IEntityHealthStatGetters, IStats } from "../../procedural-engine/domain.js";
import { BASE_MAX_PLAYER_BASE_STAT, BASE_PLAYER_HP, NullStatsGenerator } from "./defaults.js";
import { PlayerRunEntityArmors, PlayerRunEntityArmor, PlayerRunEntityWeapon } from "./types.js";

export class PlayerCombat {
    private base_stats: EntityStats;
    private stat_modifiers: EntityStats;
    private health: EntityHealthStatImpl;
    private armor_stat: PlayerRunEntityArmors;
    private weapon_stat: PlayerRunEntityWeapon;

    constructor(
        initialStats: IStats,
        initialArmorStats: PlayerRunEntityArmors,
        initialWeaponStats: PlayerRunEntityWeapon,
        level: number
    ) {
        this.base_stats = new EntityStats(initialStats);
        this.stat_modifiers = NullStatsGenerator();
        this.armor_stat = initialArmorStats;
        this.weapon_stat = initialWeaponStats;
        this.health = new EntityHealthStatImpl(this.base_stats.Stats.hp, level, BASE_PLAYER_HP);
    }

    public increaseBaseStatBy(stat: keyof IStats, amount: number, level: number): boolean {
        if (this.BaseStats[stat] + amount < 0 || this.BaseStats[stat] + amount > this.getMaxBaseStat(level)) {
            return false;
        }
        return this.base_stats.increaseStatBy(stat, amount);
    }

    public SetArmorStatFor(gear: keyof PlayerRunEntityArmors, armorStat: PlayerRunEntityArmor) {
        this.armor_stat[gear] = armorStat;
    }

    public SetWeaponStat(weaponStat: PlayerRunEntityWeapon) {
        this.weapon_stat = weaponStat;
    }

    public increaseStatModifierBy(stat: keyof IStats, amount: number): boolean {
        return this.stat_modifiers.increaseStatBy(stat, amount);
    }

    public changeHealthBy(amount: number): void {
        this.health.changeCurrentHealthBy(amount);
    }

    public resetHealth(level: number): void {
        const previousCurrentHealthPercent = this.health.CurrentHealth / this.health.MaxHealth;
        this.health.computeMaxHP(this.base_stats.Stats.hp, level);
        this.health.changeCurrentHealthBy((this.health.MaxHealth * previousCurrentHealthPercent) - this.health.CurrentHealth);
    }

    public get ArmorStats(): PlayerRunEntityArmors {
        return this.armor_stat;
    }

    public get StatChangeByArmor(): IStats {
        const totalArmorStats: IStats = { hp: 0, strength: 0, dexterity: 0, intelligence: 0, wisdom: 0, agility: 0 };
        for (const armor of Object.values(this.armor_stat)) {
            totalArmorStats.hp += armor.stats.hp;
            totalArmorStats.strength += armor.stats.strength;
            totalArmorStats.dexterity += armor.stats.dexterity;
            totalArmorStats.intelligence += armor.stats.intelligence;
            totalArmorStats.wisdom += armor.stats.wisdom;
            totalArmorStats.agility += armor.stats.agility;
        }
        return totalArmorStats;
    }

    public get WeaponStats(): PlayerRunEntityWeapon {
        return this.weapon_stat;
    }

    public get Health(): IEntityHealthStatGetters {
        return {
            MaxHealth: this.health.MaxHealth,
            CurrentHealth: this.health.CurrentHealth
        };
    }

    public get StatModifiers(): IStats {
        return this.stat_modifiers.Stats;
    }

    public get BaseStats(): IStats {
        return this.base_stats.Stats;
    }

    public getMaxBaseStat(level: number): number {
        return BASE_MAX_PLAYER_BASE_STAT + (level - 1);
    }
}
