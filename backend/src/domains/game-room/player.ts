import { EntityHealthStatImpl, EntityStats, IEntityHealthStatGetters, IStats } from "../procedural-engine/domain.js";
import { NullStatsGenerator } from "./defaults.js";

export type PlayerStatus =
  | "joined"
  | "connected"
  | "ready"
  | "disconnected"
  | "left"
  | "in-run";

export interface Player {
  userId: string;
  playerId: string;
  name: string;
  socketId: string | null;
  status: PlayerStatus;
  joinedAt?: number;
  disconnectedAt: number | null;
}

export interface PlayerPublic {
  playerId: string;
  name: string;
  status: PlayerStatus;
  isHost: boolean;
  disconnectedAt: number | null;
  stats: PlayerRunEntityJSON
}

export type PlayerRunEntityArmor = {
  armorId: string;
  stats: IStats;
  description: string;
  gear_position: "head" | "chest" | "greaves";
  armorName: string;
};

export type PlayerRunEntityWeapon = {
  weaponId: string;
  weaponName: string;
  description: string;
  stats: IStats;
}

export type PlayerRunEntityArmors = {
  head: PlayerRunEntityArmor;
  chest: PlayerRunEntityArmor;
  greaves: PlayerRunEntityArmor;
};

export type ConsumableType = "health_potion" | "gold_key" | "lockpick";
export type Consumables = Record<ConsumableType, number>;

export const DefaultConsumablesGenerator = (): Consumables => ({
  health_potion: 0,
  gold_key: 0,
  lockpick: 0
});

export type PlayerRunEntityJSON = {
  base_stats: IStats;
  stat_modifiers: IStats;
  armor_stats: PlayerRunEntityArmors;
  weapon_stats: PlayerRunEntityWeapon;
  level: number;
  experience: number;
  skill_points: number;
  gold: number;
  consumables: Consumables;
  health: IEntityHealthStatGetters;
};

export const BASE_MAX_PLAYER_BASE_STAT = 40;
export const BASE_PLAYER_HP = 100;


export class PlayerRunEntity {
  private base_stats: EntityStats;
  private stat_modifiers: EntityStats = NullStatsGenerator();
  private health: EntityHealthStatImpl;

  private armor_stat: PlayerRunEntityArmors;
  private weapon_stat: PlayerRunEntityWeapon;
  private consumables: Consumables = DefaultConsumablesGenerator();

  private level: number = 1;
  private experience: number = 0;
  private skill_points: number = 0;
  private gold: number = 200;

  constructor(initialStats: IStats, initialArmorStats: PlayerRunEntityArmors, initialWeaponStats: PlayerRunEntityWeapon, initialSkillPoints: number = 0, initialGold: number = 200) {
    this.base_stats = new EntityStats(initialStats);
    this.armor_stat = initialArmorStats;
    this.weapon_stat = initialWeaponStats;
    this.health = new EntityHealthStatImpl(this.base_stats.Stats.hp, this.level, BASE_PLAYER_HP);
    this.skill_points = initialSkillPoints;
    this.gold = initialGold;
  }

  // Stat Management
  public increaseBaseStatBy(stat: keyof IStats, amount: number): boolean {
    if (this.BaseStats[stat] + amount < 0 || this.BaseStats[stat] + amount > this.MaxBaseStat) {
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
    let result = this.stat_modifiers.increaseStatBy(stat, amount);
    return result;
  }

  // Health Management
  public changeHealthBy(amount: number): void {
    this.health.changeCurrentHealthBy(amount);
  }

  public resetHealth(): void {
    let previousCurrentHealthPercent = this.health.CurrentHealth / this.health.MaxHealth;
    this.health.computeMaxHP(this.base_stats.Stats.hp, this.level);
    this.health.changeCurrentHealthBy((this.health.MaxHealth * previousCurrentHealthPercent) - this.health.CurrentHealth);
  }

  // Gold Management
  public changeGoldBy(amt: number) {
    if (this.gold + amt < 0) {
      return false;
    }
    this.gold += amt;
    return true;
  }

  // Consumables Management
  public ChangeConsumable(consumable: ConsumableType, quantity: number): boolean {
    const newCount = this.consumables[consumable] + quantity;
    if (newCount < 0) {
      return false;
    }

    this.consumables[consumable] = newCount;
    return true;
  }

  // Increase Level and Modify Skill Points 
  public addExperience(amount: number): boolean {
    if (amount < 0)
      return false;

    this.experience += amount;

    while (this.experience >= this.NextLevelExperience) {
      this.experience = this.experience - this.NextLevelExperience;
      this.level += 1;
      this.skill_points += 3;
    }
    return true;
  }

  public modifySkill(stat: keyof IStats, points: number): boolean {
    if (points > this.skill_points) {
      return false;
    }

    if (!this.increaseBaseStatBy(stat, points)) {
      return false;
    }

    this.skill_points -= points;
    return true;
  }



  // Getters
  // Armor Stats and Modifiers Getters
  public get ArmorStats(): PlayerRunEntityArmors {
    return this.armor_stat;
  }


  public get StatChangeByArmor(): IStats {
    const totalArmorStats: IStats = {
      hp: 0,
      strength: 0,
      dexterity: 0,
      intelligence: 0,
      wisdom: 0,
      agility: 0
    };

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

  // Level , Experience, and Skill Points Getters
  public get Level(): number {
    return this.level;
  }

  public get Health(): IEntityHealthStatGetters {
    return {
      MaxHealth: this.health.MaxHealth,
      CurrentHealth: this.health.CurrentHealth
    };
  }

  public get Experience(): number {
    return this.experience;
  }

  public get SkillPoints(): number {
    return this.skill_points;
  }

  public get NextLevelExperience(): number {
    return Math.pow(this.level, 3);
  }

  public get Gold(): number {
    return this.gold;
  }

  public get Consumables(): Consumables {
    return this.consumables;
  }

  // Stat Getters
  public get StatModifiers(): IStats {
    return this.stat_modifiers.Stats;
  }

  public get BaseStats(): IStats {
    return this.base_stats.Stats;
  }

  public get MaxBaseStat(): number {
    return BASE_MAX_PLAYER_BASE_STAT + (this.level - 1);
  }

  // JSON Representation
  public get JSON(): PlayerRunEntityJSON {
    return {
      base_stats: this.BaseStats,
      stat_modifiers: this.StatModifiers,
      armor_stats: this.ArmorStats,
      weapon_stats: this.WeaponStats,
      level: this.Level,
      experience: this.Experience,
      skill_points: this.SkillPoints,
      gold: this.gold,
      consumables: this.Consumables,
      health: this.Health
    }
  }
}

