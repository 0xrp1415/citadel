export interface IStats {
    hp: number,
    strength: number,
    dexterity: number,
    intelligence: number,
    wisdom: number,
    agility: number,
}

export class EntityStats {
    private hp: number;

    private strength: number;
    private dexterity: number;
    private intelligence: number;
    private wisdom: number;
    private agility: number;

    constructor({ hp, strength, dexterity, intelligence, wisdom, agility }: IStats) {
        this.hp = hp;
        this.strength = strength;
        this.dexterity = dexterity;
        this.intelligence = intelligence;
        this.wisdom = wisdom;
        this.agility = agility;
    }

    public increaseStatBy(stat: keyof IStats, amount: number): boolean {
        if (this.Stats[stat] + amount < 0) {
            return false;
        }

        switch (stat) {
            case "hp":
                this.hp += amount;
                break;
            case "strength":
                this.strength += amount;
                break;
            case "dexterity":
                this.dexterity += amount;
                break;
            case "intelligence":
                this.intelligence += amount;
                break;
            case "wisdom":
                this.wisdom += amount;
                break;
            case "agility":
                this.agility += amount;
                break;
        }
        return true;
    }

    public setStats({ hp, strength, dexterity, intelligence, wisdom, agility }: IStats) {
        this.hp = hp;
        this.strength = strength;
        this.dexterity = dexterity;
        this.intelligence = intelligence;
        this.wisdom = wisdom;
        this.agility = agility;
    }

    public get Stats(): IStats {
        return {
            hp: this.hp,
            strength: this.strength,
            dexterity: this.dexterity,
            intelligence: this.intelligence,
            wisdom: this.wisdom,
            agility: this.agility
        };
    }
}
