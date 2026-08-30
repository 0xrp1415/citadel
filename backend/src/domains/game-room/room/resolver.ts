import { IGameRoomResolver } from "./utils/interface/resolver.js";
import { DmAction } from "../../dungeon-master/schema/actions/action.js";
import { DmVerdict } from "../../dungeon-master/schema/verdict.js";
import { IGameRoomContext } from "./utils/interface/index.js";
import { resolveAction } from "./utils/methods/action-resolver/index.js";

export class GameRoomResolver implements IGameRoomResolver {
    private readonly context: IGameRoomContext;

    constructor(context: IGameRoomContext) {
        this.context = context;
    }

    public Execute(actions: DmAction[], actorId: string): string {
        const actor = this.context.Party.getPlayer(actorId);
        const summaries: string[] = [];

        for (const action of actions) {
            summaries.push(resolveAction(action, actor, this.context));
        }

        this.context.Broadcast();
        return summaries.filter(Boolean).join(" ");
    }

    public Ambiguous(verdict: Extract<DmVerdict, { status: "ambiguous" }>): string {
        if (verdict.question) return `Outcome unclear: ${verdict.question}`;
        if (verdict.guesses?.length) {
            return `Your intent is unclear. Did you mean: ${verdict.guesses.join(", ")}?`;
        }
        return "Your intent is unclear. Please rephrase.";
    }

    public NotAllowed(reason?: string): string {
        return reason ? `That can't be done here. ${reason}` : "That can't be done here.";
    }
}
