import { IAbility } from "../../procedural-engine/index.js";

export type PlayerAbilityDetail = {
    id: string;
    name: string;
    active: boolean;
    flavor_text: string;
    description: string;
    targeting: { kind: "enemy" | "ally" | "self" | "any"; scope: "single" | "all" | "self"; type: "physical" | "magical" };
    minimumLevel: number;
    minimumStats: Partial<Record<string, number>>;
};

export class PlayerAbilities {
    private abilities: IAbility[] = [];

    private static readonly SLOT_COUNT = 4;

    private readonly activeAbilitySlots = new Map<number, string>();

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
            id: a.id,
            name: a.name,
            active: this.checkAbilityActive(a),
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

    public get ActiveAbilitySlots(): { slot: number; id: string }[] {
        return [...this.activeAbilitySlots.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([slot, id]) => ({ slot, id }));
    }

    public get ActiveAbilityIds(): string[] {
        return [...this.activeAbilitySlots.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([, id]) => id);
    }

    public has(abilityName: string): boolean {
        return this.abilities.some((a) => a.name === abilityName);
    }

    public hasId(abilityId: string): boolean {
        return this.abilities.some((a) => a.id === abilityId);
    }

    public learn(ability: IAbility): void {
        if (!this.hasId(ability.id)) {
            this.abilities.push(ability);
        }
    }

    public getAbilityById(abilityId: string): IAbility | undefined {
        return this.abilities.find((a) => a.id === abilityId);
    }

    public setActiveAbilityById(abilityId: string, slot: number): boolean {
        if (slot < 0 || slot >= PlayerAbilities.SLOT_COUNT) {
            return false;
        }
        const ability = this.getAbilityById(abilityId);
        if (!ability) {
            return false;
        }
        if (!this.checkAbilityActive(ability)) {
            return false;
        }
        if (this.activeAbilitySlots.get(slot) === abilityId) {
            return false;
        }
        for (const [existingSlot, existingId] of this.activeAbilitySlots) {
            if (existingSlot !== slot && existingId === abilityId) {
                return false;
            }
        }

        this.activeAbilitySlots.set(slot, abilityId);
        return true;
    }

    public clearActiveAbilitySlot(slot: number): boolean {
        if (slot < 0 || slot >= PlayerAbilities.SLOT_COUNT) {
            return false;
        }
        return this.activeAbilitySlots.delete(slot);
    }

    private checkAbilityActive(ability: IAbility): boolean {
        return ability.components.some((c) => c.type === "active");
    }
}
