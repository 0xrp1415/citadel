import { DmAction } from "../../../../../dungeon-master/schema/actions/action.js";
import { Player } from "../../../../player/index.js";
import { IGameRoomContext } from "../../interface/index.js";
import { getAbilityByName, IAbilityActiveContext } from "../../../../../procedural-engine/index.js";
import { PlayerAbilityActor } from "../../helpers/ability/actor.js";

export async function resolveAbility(
    action: DmAction,
    actor: Player | undefined,
    context: IGameRoomContext,
    narrate: (message: string) => Promise<void>,
): Promise<void> {
    if (!actor) return;
    const name = actor.Identity.name;
    const abilityName = action.detail;
    if (!abilityName) {
        await narrate(`${name} reaches for an ability, but none was named.`);
        return;
    }

    const ability = getAbilityByName(abilityName);
    if (!ability) {
        await narrate(`${name} knows no such ability as "${abilityName}".`);
        return;
    }
    if (!actor.Abilities.has(ability.name)) {
        await narrate(`${name} has not yet mastered ${ability.name}.`);
        return;
    }
    if (actor.Progression.Level < ability.minimumLevel) {
        await narrate(`${name} lacks the level to use ${ability.name}.`);
        return;
    }
    for (const stat of Object.keys(ability.minimumStats) as (keyof typeof ability.minimumStats)[]) {
        const required = ability.minimumStats[stat];
        if (required !== undefined && actor.Combat.EffectiveStats[stat] < required) {
            await narrate(`${name}'s ${stat} is too low to use ${ability.name}.`);
            return;
        }
    }

    const activeComponents = ability.components.filter((c) => c.type === "active");
    if (activeComponents.length === 0) {
        await narrate(`${ability.name} is a passive mastery; it grants ${ability.flavor_text.toLowerCase()}`);
        return;
    }

    const actorHandle = new PlayerAbilityActor(actor);

    const allies = context.Party.Players
        .filter((p) => p.Identity.playerId !== actor.Identity.playerId)
        .map((p) => new PlayerAbilityActor(p));

    let targets: PlayerAbilityActor[];
    if (ability.targeting.kind === "enemy") {
        targets = [];
    } else if (ability.targeting.scope === "single" && action.target_id?.length) {
        const named = action.target_id[0];
        const target = named
            ? (context.Party.getPlayer(named) ?? context.Party.getPlayerByPublicId(named))
            : undefined;
        targets = target
            ? [new PlayerAbilityActor(target)]
            : (allies.length > 0 ? allies : [actorHandle]);
    } else {
        targets = allies.length > 0 ? allies : [actorHandle];
    }

    const abilityContext: IAbilityActiveContext = {
        actor: actorHandle,
        allies,
        targets,
        targeting: ability.targeting,
    };

    const reports: string[] = [];
    for (const component of activeComponents) {
        const report = await component.onExecute(abilityContext);
        reports.push(report);
    }

    await narrate(`${name} uses ${ability.name}: ${reports.join("; ")}.`);
    context.Broadcaster.RoomUpdate();
}
