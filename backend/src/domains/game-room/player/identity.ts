export class PlayerIdentity {
    public readonly userId: string;
    public readonly playerId: string;
    public readonly playerPublicId: string;
    public readonly name: string;

    constructor(userId: string, playerId: string, playerPublicId: string, name: string) {
        this.userId = userId;
        this.playerId = playerId;
        this.playerPublicId = playerPublicId;
        this.name = name;
    }
}
