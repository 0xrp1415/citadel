export interface IStats {
    hp: number,
    strength: number,
    dexterity: number,
    intelligence: number,
    wisdom: number,
    agility: number,
}

export const NULL_STATS: IStats = {
    hp: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    wisdom: 0,
    agility: 0
};

const STAT_KEYS = Object.keys(NULL_STATS) as (keyof IStats)[];

export class EntityStats {
    private stats: Record<keyof IStats, number>;

    constructor({ hp, strength, dexterity, intelligence, wisdom, agility }: IStats) {
        this.stats = { hp, strength, dexterity, intelligence, wisdom, agility };
    }

    public increaseStatBy(stat: keyof IStats, amount: number): boolean {
        if (this.stats[stat] + amount < 0) {
            return false;
        }
        this.stats[stat] += amount;
        return true;
    }

    public setStats(stats: IStats): void {
        this.stats = { ...stats };
    }

    public get Stats(): IStats {
        return { ...this.stats };
    }
}

export function sumStats(sources: readonly IStats[]): IStats {
    const total: IStats = { ...NULL_STATS };
    for (const source of sources) {
        for (const stat of STAT_KEYS) {
            total[stat] += source[stat];
        }
    }
    return total;
}
