import { CreateDungeonMaster, IDungeonMaster, TRoomViewGenerator } from "../../dungeon-master/index.js";
import { DmVerdict } from "../../dungeon-master/types.js";
import { deriveRoomExits } from "./utils/helpers/map/exits.js";
import { IGameRoomDungeonMasterAdapter } from "./utils/interface/dm-adapter.js";
import { IGameRoomContext } from "./utils/interface/index.js";

export class GameRoomDMAdapter implements IGameRoomDungeonMasterAdapter {
    private context: IGameRoomContext;

    private readonly dungeonMaster: IDungeonMaster;

    private dungeonMasterMessages: { from: string, message: string }[];

    constructor(context: IGameRoomContext) {
        this.context = context;
        this.dungeonMaster = CreateDungeonMaster({ roomViewGenerator: () => this.GenerateRoomView() });
        this.dungeonMasterMessages = [];
    }

    private async GenerateRoomView(): ReturnType<TRoomViewGenerator> {
        const currentRoom = this.context.Map.CurrentRoom;
        const exits = deriveRoomExits(currentRoom?.id ?? 0, currentRoom?.exits ?? { left: null, right: null, up: null, down: null })

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
            })),

        };
    }

    public async Resolve(from: string, text: string): Promise<DmVerdict> {
        this.DungeonMasterMessages.push({ from: from, message: text });
        return this.dungeonMaster.Resolve(text);
    }

    public async Narrate(from: string, eventText: string): Promise<string> {
        this.DungeonMasterMessages.push({ from: from, message: eventText });
        return this.dungeonMaster.Narrate(eventText);
    }

    public get DMState() {
        return this.dungeonMaster.State;
    }

    public get DungeonMasterMessages(): { from: string, message: string }[] {
        return this.dungeonMasterMessages;
    }


}