import { IAbilityActor, IStats } from "../../../../../procedural-engine/index.js";
import { Player } from "../../../../player/index.js";

export class PlayerAbilityActor implements IAbilityActor {
    private readonly player: Player;

    constructor(player: Player) {
        this.player = player;
    }

    public get name(): string {
        return this.player.Identity.name;
    }

    public get level(): number {
        return this.player.Progression.Level;
    }

    public get alive(): boolean {
        return this.player.Combat.Health.CurrentHealth > 0;
    }

    public get stats(): IStats {
        return this.player.Combat.BaseStats;
    }

    public get modifiers(): IStats {
        return this.player.Combat.StatModifiers;
    }

    public get maxHealth(): number {
        return this.player.Combat.Health.MaxHealth;
    }

    public get currentHealth(): number {
        return this.player.Combat.Health.CurrentHealth;
    }

    public Heal(amount: number): void {
        this.player.Combat.changeHealthBy(amount);
    }

    public TakeDamage(amount: number): void {
        this.player.Combat.changeHealthBy(-amount);
    }

    public ApplyStatModifiers(modifiers: Partial<Record<keyof IStats, number>>): void {
        for (const stat of Object.keys(modifiers) as (keyof IStats)[]) {
            const value = modifiers[stat];
            if (value !== undefined) {
                this.player.Combat.increaseStatModifierBy(stat, value);
            }
        }
    }
}
