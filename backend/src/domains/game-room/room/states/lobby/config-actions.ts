import { IGameRoomContext } from "../../utils/interface/index.js";
import { ActionHandler, ZGameRoomConfigSchema } from "../../utils/types.js";

export function updateConfig(ctx: IGameRoomContext): ActionHandler {
    return (playerId, payload) => {
        if (ctx.Party.Leader !== playerId) {
            return { ok: false, status: 403, error: "Only the leader can update config" };
        }

        const { config } = payload as { config: unknown };
        const parsed = ZGameRoomConfigSchema.safeParse(config);
        if (!parsed.success) {
            return { ok: false, status: 400, error: "Invalid configuration" };
        }

        ctx.Identity.SetConfig(parsed.data);
        ctx.Broadcast();
        return { ok: true, value: null };
    };
}