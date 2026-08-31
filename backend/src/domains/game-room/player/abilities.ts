import { IAbility } from "../../procedural-engine/index.js";

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