export interface IEntityHealthStatGetters {

    get MaxHealth(): number;
    get CurrentHealth(): number;
}

export interface IEntityHealthStat extends IEntityHealthStatGetters {
    changeCurrentHealthBy(amount: number): void;
    computeMaxHP(hp: number, level: number): void;
    isDead(): boolean;
}



export class EntityHealthStatImpl implements IEntityHealthStat {
    private maxHealth: number;
    private currentHealth: number;

    private readonly baseMaxHealth: number;

    constructor(hp: number, level: number, baseMaxHealth: number, currentHealth?: number) {
        this.maxHealth = baseMaxHealth + hp * level;
        this.baseMaxHealth = baseMaxHealth;
        this.currentHealth = currentHealth ?? this.maxHealth;
    }

    public changeCurrentHealthBy(amount: number): void {
        this.currentHealth = Math.max(0, Math.min(this.currentHealth + amount, this.maxHealth));
    }

    public computeMaxHP(hp: number, level: number): void {
        if (hp < 0) {
            throw new Error("Max health cannot be negative");
        }
        this.maxHealth = (this.baseMaxHealth) + (hp * level);
        if (this.currentHealth > this.maxHealth) {
            this.currentHealth = this.maxHealth;
        }
    }

    public isDead(): boolean {
        return this.currentHealth <= 0;
    }

    public get MaxHealth(): number {
        return this.maxHealth;
    }

    public get CurrentHealth(): number {
        return this.currentHealth;
    }
}