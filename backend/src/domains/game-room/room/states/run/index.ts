import { GameRoomState } from "../base/index.js";
import { ActionHandler } from "../../utils/types.js";
import { playerConnect, playerDisconnect } from "../base/shared-actions.js";
import { changePlayerStats, confirmPlayerAction, equipItem, resolvePlayerAction, unequipItem, useInventoryItem } from "./player-actions.js";
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
        player_play:       resolvePlayerAction(this.context),
        player_confirm:    confirmPlayerAction(this.context),
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