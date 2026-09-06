import { DefaultGold, DefaultSkillPoints, DefaultStartingInventory, toArmorPiece, toItem, toWeapon } from "./defaults.js";
import { PlayerAbilities } from "./abilities.js";
import { PlayerCombat } from "./combat.js";
import { PlayerIdentity } from "./identity.js";
import { PlayerInventory } from "./inventory.js";
import { PlayerProgression } from "./progression.js";
import { PlayerSocket } from "./socket.js";
import { PlayerPublic, PlayerRunEntityJSON, PlayerStatus } from "./types.js";
export type { PlayerPublic, PlayerRunEntityJSON, PlayerStatus } from "./types.js";
import { IAbility } from "../../procedural-engine/index.js";
import { StarterKitId, getStarterKit } from "./kits.js";

export class Player {
    public status: PlayerStatus;

    private readonly identity: PlayerIdentity;
    private socket: PlayerSocket;
    private combat: PlayerCombat;
    private progression: PlayerProgression;
    private inventory: PlayerInventory;
    private abilities!: PlayerAbilities;
    private kit: StarterKitId;

    constructor(userId: string, playerId: string, playerPublicId: string, name: string, startingAbilities: IAbility[] = [], kit: StarterKitId = "wanderer") {
        this.identity = new PlayerIdentity(userId, playerId, playerPublicId, name);
        this.status = "joined";
        this.kit = kit;

        this.socket = new PlayerSocket();
        this.progression = new PlayerProgression(DefaultSkillPoints());
        this.combat = new PlayerCombat(
            { hp: 20, strength: 20, dexterity: 20, intelligence: 20, wisdom: 20, agility: 20 },
            this.progression.Level
        );
        
        this.progression.onLevelChange((newLevel) => this.combat.onLevelChange(newLevel));
        
        this.inventory = new PlayerInventory(DefaultGold());
        this.populateInventory(startingAbilities);
    }

    private populateInventory(startingAbilities: IAbility[]): void {
        const kitData = getStarterKit(this.kit);
        const abilityIds = kitData?.abilities ?? [];
        const items = DefaultStartingInventory(this.kit);
        for (const item of items) {
            this.inventory.addItem(item);
        }
        this.abilities = new PlayerAbilities(startingAbilities.length > 0 ? startingAbilities : []);
    }

    public setKit(kit: StarterKitId): void {
        this.kit = kit;
        this.inventory = new PlayerInventory(DefaultGold());
        this.populateInventory([]);
    }

    public get Kit(): StarterKitId {
        return this.kit;
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
        const gear = this.inventory.Gear;
        const weapon = this.inventory.Weapon;
        return {
            base_stats: this.combat.BaseStats,
            stat_modifiers: this.combat.StatModifiers,
            temp_stat_modifiers: this.combat.TempStatModifiers,
            armor_stats: {
                head: gear.head ? toArmorPiece(gear.head, "head") : null,
                chest: gear.chest ? toArmorPiece(gear.chest, "chest") : null,
                greaves: gear.greaves ? toArmorPiece(gear.greaves, "greaves") : null,
            },
            weapon_stats: weapon ? toWeapon(weapon) : null,
            level: this.progression.Level,
            experience: this.progression.Experience,
            skill_points: this.progression.SkillPoints,
            gold: this.inventory.Gold,
            consumables: this.inventory.Consumables,
            items: this.inventory.Inventory.map(([item, count]) => toItem(item, count)),
            health: this.combat.Health,
            abilities: this.abilities.Details,
            activeAbilities: this.abilities.ActiveAbilitySlots,
        };
    }

    public get PublicJSON(): PlayerPublic {
        return {
            playerId: this.identity.playerId,
            playerPublicId: this.identity.playerPublicId,
            name: this.identity.name,
            status: this.status,
            disconnectedAt: this.socket.DisconnectedAt,
            kit: this.kit,
            stats: this.JSON,
        };
    }
}
