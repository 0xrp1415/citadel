export interface IEntityHealthStatGetters {
    get MaxHealth(): number;
    get CurrentHealth(): number;
}

export interface IEntityHealthStat extends IEntityHealthStatGetters {
    setMaxHealth(maxHealth: number): void;
    changeCurrentHealthBy(amount: number): void;
    isDead(): boolean;
}

export class EntityHealthStatImpl implements IEntityHealthStat {
    private maxHealth: number;
    private currentHealth: number;

    constructor(maxHealth: number, currentHealth?: number) {
        this.maxHealth = maxHealth;
        this.currentHealth = currentHealth ?? maxHealth;
    }

    public setMaxHealth(maxHealth: number): void {
        if (maxHealth < 0) {
            throw new Error("Max health cannot be negative");
        }
        this.maxHealth = maxHealth;
        if (this.currentHealth > this.maxHealth) {
            this.currentHealth = this.maxHealth;
        }
    }

    public changeCurrentHealthBy(amount: number): void {
        this.currentHealth = Math.max(0, Math.min(this.currentHealth + amount, this.maxHealth));
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
