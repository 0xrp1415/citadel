import { IGameRoomContext } from "../../utils/interface/index.js";
import { buildRoomFactContext } from "../../utils/helpers/map/room-facts.js";
import { CombatManager, ERoomType, rollLoot } from "../../../../procedural-engine/index.js";
import { IItem } from "../../../../procedural-engine/item/base.js";

function maybeStartEncounter(ctx: IGameRoomContext): void {
    const enemies = ctx.Map.CurrentRoom?.encounters?.enemies ?? [];
    const living = enemies.filter((e) => CombatManager.IsAlive(e));
    if (living.length > 0 && !ctx.Encounter.Active) {
        ctx.Encounter.StartEncounter(enemies);
    }
}

function reviveDownedPlayers(ctx: IGameRoomContext): string[] {
    const revived: string[] = [];
    for (const player of ctx.Party.Players) {
        if (player.Combat.Health.CurrentHealth <= 0) {
            const healAmount = player.Combat.Health.MaxHealth;
            CombatManager.ReviveAndHeal(player.Combat, healAmount);
            revived.push(player.Identity.name);
        }
    }
    return revived;
}

function awardRoomLoot(ctx: IGameRoomContext): void {
    const roomType = ctx.Map.CurrentRoom?.type;
    if (roomType !== ERoomType.TREASURE && roomType !== ERoomType.SECRET) return;

    const players = ctx.Party.Players.filter((p) => p.status !== "disconnected" && p.status !== "left");
    if (players.length === 0) return;

    const floor = ctx.Map.Floor;
    const rng = ctx.Map.CreateRng();
    const droppedItems: IItem[] = [];

    for (const player of players) {
        const loot = rollLoot(roomType, floor, rng);
        for (const item of loot.items) {
            droppedItems.push(item);
        }
        if (loot.gold > 0) {
            player.Inventory.addGold(loot.gold);
        }
    }

    ctx.Map.DropItems(droppedItems);
}

export async function enterRoom(
    ctx: IGameRoomContext,
    targetRoomIndex: number,
    narrate?: (description: string) => Promise<void>,
    transition?: string,
): Promise<string> {
    ctx.Map.EnterRoom(targetRoomIndex);
    const faded = ctx.Party.Players.some((p) => p.Combat.clearTemporaryStatModifiers());

    if (ctx.Map.CurrentRoom?.type === ERoomType.GRACE) {
        const revived = reviveDownedPlayers(ctx);
        if (revived.length > 0) {
            ctx.Broadcaster.RoomUpdate();
            const names = revived.length === 1 ? revived[0] : `${revived.slice(0, -1).join(", ")} and ${revived[revived.length - 1]}`;
            const graceNarration = `${names} ${revived.length === 1 ? "is" : "are"} restored by the sanctum's light, rising from the brink.`;
            if (narrate) {
                await narrate(graceNarration);
            } else {
                await ctx.DMAdapter.Narrate(graceNarration);
                ctx.Broadcaster.MessageUpdate();
            }
        }
    }

    ctx.Broadcaster.RoomUpdate();

    const description = buildRoomFactContext(ctx.Map.Map, ctx.Map.CurrentRoom, ctx.Map.VisitedRooms, ctx.Party.Players, {
        transition: faded && transition ? `${transition} — the surge of power fades with the crossing.` : transition,
    });

    if (narrate) {
        await narrate(description);
        maybeStartEncounter(ctx);
        awardRoomLoot(ctx);
        return description;
    }

    const narration = await ctx.DMAdapter.Narrate(description);
    ctx.Broadcaster.MessageUpdate();
    maybeStartEncounter(ctx);
    awardRoomLoot(ctx);
    return narration;
}
