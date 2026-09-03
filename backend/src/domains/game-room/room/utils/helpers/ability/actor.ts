import { IAbilityActor, EntityCombat } from "../../../../../procedural-engine/index.js";
import { Player } from "../../../../player/index.js";

export class PlayerAbilityActor implements IAbilityActor {
    private readonly player: Player;

    constructor(player: Player) {
        this.player = player;
    }

    public get combat(): EntityCombat {
        return this.player.Combat;
    }

    public get name(): string {
        return this.player.Identity.name;
    }

    public get scale_factor(): number {
        return this.player.Progression.Level;
    }
}
