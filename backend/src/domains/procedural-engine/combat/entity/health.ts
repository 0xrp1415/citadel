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
    private maxHealthSource: number;
    private currentHealth: number;
    private readonly resolveMaxHealth?: () => number;

    constructor(maxHealth: number, currentHealth?: number, resolveMaxHealth?: () => number) {
        this.maxHealthSource = maxHealth;
        this.currentHealth = currentHealth ?? maxHealth;
        this.resolveMaxHealth = resolveMaxHealth;
    }

    public get MaxHealth(): number {
        if (this.resolveMaxHealth) {
            return this.resolveMaxHealth();
        }
        return this.maxHealthSource;
    }

    public get CurrentHealth(): number {
        return Math.min(this.currentHealth, this.MaxHealth);
    }

    public setMaxHealth(maxHealth: number): void {
        if (maxHealth < 0) {
            throw new Error("Max health cannot be negative");
        }
        this.maxHealthSource = maxHealth;
        if (this.currentHealth > this.MaxHealth) {
            this.currentHealth = this.MaxHealth;
        }
    }

    public changeCurrentHealthBy(amount: number): void {
        this.currentHealth = Math.max(0, Math.min(this.currentHealth + amount, this.MaxHealth));
    }

    public isDead(): boolean {
        return this.CurrentHealth <= 0;
    }

    public toJSON(): IEntityHealthStatGetters {
        return {
            MaxHealth: this.MaxHealth,
            CurrentHealth: this.CurrentHealth,
        };
    }
}
