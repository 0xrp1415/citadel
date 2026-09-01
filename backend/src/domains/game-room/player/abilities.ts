import { IAbility } from "../../procedural-engine/index.js";

export type PlayerAbilityDetail = {
    name: string;
    flavor_text: string;
    description: string;
    targeting: { kind: "enemy" | "ally" | "self" | "any"; scope: "single" | "all" | "self" };
    minimumLevel: number;
    minimumStats: Partial<Record<string, number>>;
};

export class PlayerAbilities {
    private abilities: IAbility[] = [];

    constructor(abilities: IAbility[] = []) {
        this.abilities = abilities;
    }

    public get Abilities(): IAbility[] {
        return this.abilities;
    }

    public get Names(): string[] {
        return this.abilities.map((a) => a.name);
    }

    public get Details(): PlayerAbilityDetail[] {
        return this.abilities.map((a) => ({
            name: a.name,
            flavor_text: a.flavor_text,
            description:
                a.components
                    .map((c) => c.flavor_text)
                    .filter((t) => t.trim().length > 0)
                    .join(" ") || a.flavor_text,
            targeting: a.targeting,
            minimumLevel: a.minimumLevel,
            minimumStats: a.minimumStats,
        }));
    }
    

    public has(abilityName: string): boolean {
        return this.abilities.some((a) => a.name === abilityName);
    }

    public learn(ability: IAbility): void {
        if (!this.has(ability.name)) {
            this.abilities.push(ability);
        }
    }

    public removeAbilityByIndex(abilityName: string): void {
        this.abilities = this.abilities.filter(a => a.name !== abilityName);
    }
}