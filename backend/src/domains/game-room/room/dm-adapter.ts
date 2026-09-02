import { CreateDungeonMaster, IDungeonMaster, TRoomViewGenerator } from "../../dungeon-master/index.js";
import { DmVerdict } from "../../dungeon-master/types.js";
import { getAbilityById } from "../../procedural-engine/index.js";
import { deriveRoomExits } from "./utils/helpers/map/exits.js";
import { resolveAbilityTokens } from "./utils/helpers/ability-tokens.js";
import { resolveMentions } from "./utils/helpers/mentions.js";
import { IGameRoomDungeonMasterAdapter } from "./utils/interface/dm-adapter.js";
import { IGameRoomContext } from "./utils/interface/index.js";

export class GameRoomDMAdapter implements IGameRoomDungeonMasterAdapter {
    private context: IGameRoomContext;

    private readonly dungeonMaster: IDungeonMaster;


    constructor(context: IGameRoomContext) {
        this.context = context;
        this.dungeonMaster = CreateDungeonMaster({
            roomViewGenerator: () => this.GenerateRoomView(),
            onStateChange: () => this.context.Broadcaster.MessageUpdate(),
        });
    }

    private speakerName(from: string): string {
        const idx = from.indexOf(":");
        const id = (idx === -1 ? from : from.slice(idx + 1)).trim();
        return this.context.Party.getPlayerByPublicId(id)?.Identity.name ?? id;
    }

    private async GenerateRoomView(): ReturnType<TRoomViewGenerator> {
        const currentRoom = this.context.Map.CurrentRoom;
        const exits = deriveRoomExits(currentRoom?.id ?? 0, currentRoom?.exits ?? { north: null, south: null, east: null, west: null })

        return {
            roomId: currentRoom?.id ?? 0,
            roomType: currentRoom?.type ?? "normal",
            exits,
            party: this.context.Party.Players.map(member => ({
                id: member.Identity.playerId,
                name: member.Identity.name,
                alive: member.Combat.Health.CurrentHealth > 0,
                hp: member.Combat.Health.CurrentHealth,
                maxHp: member.Combat.Health.MaxHealth,
                level: member.Progression.Level,
                gold: member.Inventory.Gold,
                consumables: {
                    health_potion: member.Inventory.Consumables.health_potion,
                    gold_key: member.Inventory.Consumables.gold_key,
                    lockpick: member.Inventory.Consumables.lockpick,
                },
                abilities: member.Abilities.Abilities.map((ability) => ({
                    name: ability.name,
                    flavor_text: ability.flavor_text,
                    targeting: ability.targeting,
                })),
            })),

        };
    }

    public async Resolve(from: string, text: string): Promise<DmVerdict> {
        const { forDm: mentionsResolved } = resolveMentions(text, (id) =>
            this.context.Party.getPlayerByPublicId(id)?.Identity.name
        );
        const { forDm } = resolveAbilityTokens(mentionsResolved, (id) =>
            getAbilityById(id)?.name
        );
        let result = await this.dungeonMaster.Resolve(forDm, this.speakerName(from));
        return result;

    }

    public async Narrate(eventText: string): Promise<string> {
        let narration = await this.dungeonMaster.Narrate(eventText);
        return narration;
    }
}