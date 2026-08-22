export class PlayerIdentity {
    public readonly userId: string;
    public readonly playerId: string;
    public readonly name: string;

    constructor(userId: string, playerId: string, name: string) {
        this.userId = userId;
        this.playerId = playerId;
        this.name = name;
    }
}
