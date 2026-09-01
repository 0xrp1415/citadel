import { DmAction } from "../../../../../dungeon-master/schema/actions/action.js";
import { Player } from "../../../../player/index.js";
import { IGameRoomContext } from "../../interface/index.js";
import { enterRoom } from "../../../states/run/enter-room.js";

export async function resolveMove(action: DmAction, actor: Player | undefined, context: IGameRoomContext, narrate: (message: string) => Promise<void>): Promise<void> {
    if (!action.direction) return;

    const currentRoom = context.Map.CurrentRoom;
    
    if (!currentRoom) {
        await narrate("There is nowhere to go yet.");
        return;
    }

    const passage = currentRoom.exits[action.direction];
    if (!passage) {
        await narrate(`There is no exit to the ${action.direction}.`);
        return;
    }
    if (!passage.Unlocked) {
        const event = passage.Event;
        if (event) {
            await narrate(`The passage to the ${action.direction} is locked. It is barred by a ${event.type} trial demanding ${event.requiredStat}.`);
            return;
        }
        await narrate(`The passage to the ${action.direction} is locked.`);
        return;
    }

    const actorName = actor?.Identity.name ?? "The party";
    const direction = action.direction;

    const connectedPlayers = context.Party.Players.filter(
        (p) => p.status !== "disconnected" && p.status !== "left" && p.status !== "joined"
    );

    if (connectedPlayers.length <= 1) {
        const traveled = context.Map.Travel(direction);
        if (traveled !== null) {
            await enterRoom(context, context.Map.CurrentRoomIndex, narrate, `${actorName} ventures ${direction} alone`);
        }
        return;
    }

    context.Confirmation.Start("unanimous", async (accepted) => {
        if (!accepted) return;
        const traveled = context.Map.Travel(direction);
        if (traveled !== null) {
            await enterRoom(context, context.Map.CurrentRoomIndex, (d) => context.Resolver.NarrateRoom(d), `${actorName} leads the party ${direction}`);
        }
    });

    await narrate(`${actorName} proposes the party move ${direction}. The descent votes as one—all must agree.`);
}
