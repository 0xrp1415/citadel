import { GameRoomState } from "../base/index.js";
import { ActionHandler } from "../../utils/types.js";
import { playerConnect, playerDisconnect } from "../base/shared-actions.js";
import { changePlayerStats, combatSelectAction, combatSelectTarget, equipItem, resolvePlayerAction, setActiveAbility, unequipItem, useInventoryItem, vote, buyItem, sellItem, dropItem, pickUpItem } from "./player-actions.js";
import { enterRoom } from "./enter-room.js";

export class InRunState extends GameRoomState {
    protected readonly _id: string = "in-run";

    protected readonly actions: Record<string, ActionHandler> = {
        player_connect:    playerConnect(this.context),
        player_disconnect: playerDisconnect(this.context),
        change_player_stats: changePlayerStats(this.context),
        equip_item:          equipItem(this.context),
        unequip_item:        unequipItem(this.context),
        use_inventory_item:  useInventoryItem(this.context),
        set_active_ability:  setActiveAbility(this.context),
        player_play:       resolvePlayerAction(this.context),
        vote:              vote(this.context),
        combat_select_action: combatSelectAction(this.context),
        combat_select_target: combatSelectTarget(this.context),
        buy_item:          buyItem(this.context),
        sell_item:         sellItem(this.context),
        drop_item:         dropItem(this.context),
        pick_up_item:      pickUpItem(this.context),
    };

    public async onEnterState(): Promise<void> {
        for (const player of this.context.Party.Players) {
            player.status = "in-run";
        }
        if (this.context.Map.Map === null) {
            this.context.Map.GenerateMap(this.context.Identity.Config);
        }
        await enterRoom(this.context, this.context.Map.CurrentRoomIndex, (d) => this.context.Resolver.NarrateRoom(d));
    }

    public async onExitState(): Promise<void> {}
}
