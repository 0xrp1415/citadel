import { IGameRoomResolver } from "./utils/interface/resolver.js";
import { DmAction } from "../../dungeon-master/schema/actions/action.js";
import { DmVerdict } from "../../dungeon-master/schema/verdict.js";
import { IGameRoomContext } from "./utils/interface/index.js";
import { resolveAction } from "./utils/methods/action-resolver/index.js";

export class GameRoomResolver implements IGameRoomResolver {
    private readonly context: IGameRoomContext;
    private dungeonMasterMessages: { from: string, message: string }[] = [];

    private isBusy: boolean = false;

    constructor(context: IGameRoomContext) {
        this.context = context;
    }


    async HandlePlayerAction(action: string, actorId: string): Promise<void> {
        this.isBusy = true;
        this.dungeonMasterMessages.push({ from: actorId, message: action });
        this.context.Broadcaster.MessageUpdate();

        try {
            let verdict = await this.context.DMAdapter.Resolve(actorId, action);
            switch (verdict.status) {
                case "execute":
                    await this.Execute(verdict.actions, actorId);
                    break;
                case "ambiguous":
                    await this.Ambiguous(verdict);
                    break;
                case "not_allowed":
                    await this.NotAllowed(verdict.reason);
                    break;
            }
        } catch (error) {
            console.error("HandlePlayerAction failed:", error);
            await this.NarrateOutcomes("Something went wrong while the party acted. Try again.");
        } finally {
            this.context.Broadcaster.RoomUpdate();
            this.isBusy = false;
            this.context.Broadcaster.MessageUpdate();
        }
    }

    private async Execute(actions: DmAction[], actorId: string): Promise<void> {
        const actor = this.context.Party.getPlayer(actorId);

        for (const action of actions) {
            await resolveAction(action, actor, this.context, (message: string) => this.NarrateOutcomes(message));
        }

        this.context.Broadcaster.RoomUpdate();
    }

    private async Ambiguous(verdict: Extract<DmVerdict, { status: "ambiguous" }>) {
        if (verdict.question) return await this.NarrateOutcomes(`Outcome unclear: ${verdict.question}`);
        if (verdict.guesses?.length) {
            return await this.NarrateOutcomes(`Your action is ambiguous. Possible interpretations: ${verdict.guesses.join(", ")}`);
        }
        await this.NarrateOutcomes(`Your action is ambiguous. The Dungeon Master could not determine what you meant.`);

    }

    private async NotAllowed(reason?: string) {
        await this.NarrateOutcomes(`Your action is not allowed. ${reason ?? ""}`);
    }

    private async NarrateOutcomes(message: string): Promise<void> {
        let outcomeNarrateMsg = await this.context.DMAdapter.Narrate(message);
        this.dungeonMasterMessages.push({ from: "Dungeon Master", message: outcomeNarrateMsg });
        this.context.Broadcaster.MessageUpdate();
    }

    public async NarrateRoom(description: string): Promise<void> {
        await this.NarrateOutcomes(description);
    }


    get DungeonMasterMessages(): { from: string; message: string; }[] {
        return this.dungeonMasterMessages;
    }

    get IsBusy(): boolean {
        return this.isBusy;
    }
}
