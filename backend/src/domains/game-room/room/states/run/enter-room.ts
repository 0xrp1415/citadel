import { IGameRoomContext } from "../../utils/interface/index.js";
import { buildRoomFactContext } from "../../utils/helpers/map/room-facts.js";
import { CombatManager } from "../../../../procedural-engine/index.js";

function maybeStartEncounter(ctx: IGameRoomContext): void {
    const enemies = ctx.Map.CurrentRoom?.encounters?.enemies ?? [];
    const living = enemies.filter((e) => CombatManager.IsAlive(e));
    if (living.length > 0 && !ctx.Encounter.Active) {
        ctx.Encounter.StartEncounter(enemies);
    }
}

export async function enterRoom(
    ctx: IGameRoomContext,
    targetRoomIndex: number,
    narrate?: (description: string) => Promise<void>,
    transition?: string,
): Promise<string> {
    ctx.Map.EnterRoom(targetRoomIndex);
    const faded = ctx.Party.Players.some((p) => p.Combat.clearTemporaryStatModifiers());
    ctx.Broadcaster.RoomUpdate();

    const description = buildRoomFactContext(ctx.Map.Map, ctx.Map.CurrentRoom, ctx.Map.VisitedRooms, ctx.Party.Players, {
        transition: faded && transition ? `${transition} — the surge of power fades with the crossing.` : transition,
    });

    if (narrate) {
        await narrate(description);
        maybeStartEncounter(ctx);
        return description;
    }

    const narration = await ctx.DMAdapter.Narrate(description);
    ctx.Broadcaster.MessageUpdate();
    maybeStartEncounter(ctx);
    return narration;
}
