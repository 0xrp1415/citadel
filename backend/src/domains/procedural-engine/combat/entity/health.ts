export interface IEntityHealthStatGetters {
    get MaxHealth(): number;
    get CurrentHealth(): number;
}

export class EntityHealthStatImpl implements IEntityHealthStatGetters {
    private maxHealthSource: number;
    private currentHealth: number;
    private readonly resolveMaxHealth?: () => number;
    private lastMaxHealth: number;

    constructor(maxHealth: number, currentHealth?: number, resolveMaxHealth?: () => number) {
        this.maxHealthSource = maxHealth;
        this.currentHealth = currentHealth ?? maxHealth;
        this.resolveMaxHealth = resolveMaxHealth;
        this.lastMaxHealth = this.computeMaxHealth();
        this.currentHealth = Math.min(this.currentHealth, this.lastMaxHealth);
    }

    private computeMaxHealth(): number {
        return this.resolveMaxHealth ? this.resolveMaxHealth() : this.maxHealthSource;
    }

    public get MaxHealth(): number {
        const max = this.computeMaxHealth();
        if (max !== this.lastMaxHealth) {
            this.rescaleTo(max);
            this.lastMaxHealth = max;
        }
        this.currentHealth = Math.min(this.currentHealth, max);
        return max;
    }

    public get CurrentHealth(): number {
        // Reading current health also reconciles max-HP changes, preserving ratio.
        void this.MaxHealth;
        return this.currentHealth;
    }

    public setMaxHealth(maxHealth: number): void {
        if (maxHealth < 0) {
            throw new Error("Max health cannot be negative");
        }
        const oldMax = this.MaxHealth;
        this.maxHealthSource = maxHealth;
        if (oldMax > 0) {
            this.currentHealth = Math.round((this.currentHealth * maxHealth) / oldMax);
        }
        this.lastMaxHealth = maxHealth;
        this.currentHealth = Math.min(this.currentHealth, maxHealth);
    }

    public changeCurrentHealthBy(amount: number): void {
        this.currentHealth = Math.max(0, Math.min(this.currentHealth + amount, this.MaxHealth));
    }

    public isDead(): boolean {
        return this.CurrentHealth <= 0;
    }

    private rescaleTo(newMax: number): void {
        if (this.lastMaxHealth > 0) {
            this.currentHealth = Math.round((this.currentHealth * newMax) / this.lastMaxHealth);
        }
    }

    public toJSON(): IEntityHealthStatGetters {
        return {
            MaxHealth: this.MaxHealth,
            CurrentHealth: this.CurrentHealth,
        };
    }
}
