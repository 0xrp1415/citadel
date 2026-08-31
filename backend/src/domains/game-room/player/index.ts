import { DefaultArmourGenerator, DefaultWeaponGenerator, DefaultGold, DefaultSkillPoints } from "./defaults.js";
import { PlayerAbilities } from "./abilities.js";
import { PlayerCombat } from "./combat.js";
import { PlayerIdentity } from "./identity.js";
import { PlayerInventory } from "./inventory.js";
import { PlayerProgression } from "./progression.js";
import { PlayerSocket } from "./socket.js";
import { PlayerPublic, PlayerRunEntityJSON, PlayerStatus } from "./types.js";
export type { PlayerPublic, PlayerRunEntityJSON, PlayerStatus } from "./types.js";
import { IAbility } from "../../procedural-engine/index.js";

export class Player {
    public status: PlayerStatus;
    
    private readonly identity: PlayerIdentity;
    private socket: PlayerSocket;
    private combat: PlayerCombat;
    private progression: PlayerProgression;
    private inventory: PlayerInventory;
    private abilities: PlayerAbilities;

    constructor(userId: string, playerId: string, playerPublicId: string, name: string, startingAbilities: IAbility[] = []) {
        this.identity = new PlayerIdentity(userId, playerId, playerPublicId, name);
        this.status = "joined";

        this.socket = new PlayerSocket();
        this.progression = new PlayerProgression(DefaultSkillPoints());
        this.combat = new PlayerCombat(
            { hp: 20, strength: 20, dexterity: 20, intelligence: 20, wisdom: 20, agility: 20 },
            DefaultArmourGenerator(),
            DefaultWeaponGenerator(),
            this.progression.Level
        );
        this.inventory = new PlayerInventory(DefaultGold());
        this.abilities = new PlayerAbilities(startingAbilities);
    }

    public get Socket(): PlayerSocket {
        return this.socket;
    }
    public get Identity(): PlayerIdentity {
        return this.identity;
    }
    public get Combat(): PlayerCombat {
        return this.combat;
    }
    public get Progression(): PlayerProgression {
        return this.progression;
    }
    public get Inventory(): PlayerInventory {
        return this.inventory;
    }
    public get Abilities(): PlayerAbilities {
        return this.abilities;
    }
    
    // --- JSON ---
    public get JSON(): PlayerRunEntityJSON {
        return {
            base_stats: this.combat.BaseStats,
            stat_modifiers: this.combat.StatModifiers,
            armor_stats: this.combat.ArmorStats,
            weapon_stats: this.combat.WeaponStats,
            level: this.progression.Level,
            experience: this.progression.Experience,
            skill_points: this.progression.SkillPoints,
            gold: this.inventory.Gold,
            consumables: this.inventory.Consumables,
            health: this.combat.Health,
            abilities: this.abilities.Names,
        };
    }

    public get PublicJSON(): PlayerPublic {
        return {
            playerId: this.identity.playerId,
            playerPublicId: this.identity.playerPublicId,
            name: this.identity.name,
            status: this.status,
            disconnectedAt: this.socket.DisconnectedAt,
            stats: this.JSON,
        };
    }
}
