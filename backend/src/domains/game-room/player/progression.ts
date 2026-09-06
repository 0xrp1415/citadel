export class PlayerProgression {
    private level: number = 1;
    private experience: number = 0;
    private skill_points: number;

    private levelChangeListeners: Array<(newLevel: number) => void> = [];

    constructor(initialSkillPoints: number = 50) {
        this.skill_points = initialSkillPoints;
    }

    public canAffordSkill(points: number): boolean {
        return points <= this.skill_points;
    }

    public spendSkillPoints(points: number): void {
        this.skill_points -= points;
    }

    public addExperience(amount: number): boolean {
        if (amount < 0) return false;

        this.experience += amount;

        while (this.experience >= this.NextLevelExperience) {
            this.experience = this.experience - this.NextLevelExperience;
            this.level += 1;
            this.levelChangeListeners.forEach(listener => listener(this.level));
            this.skill_points += 3;
        }
        return true;
    }

    public onLevelChange(listener: (newLevel: number) => void): void {
        this.levelChangeListeners.push(listener);
    }

    public get Level(): number {
        return this.level;
    }

    public get Experience(): number {
        return this.experience;
    }

    public get SkillPoints(): number {
        return this.skill_points;
    }

    public get NextLevelExperience(): number {
        return Math.pow(this.level, 3);
    }
}
