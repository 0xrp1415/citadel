import { IGameRoomContext } from "./utils/interface/index.js";
import { Player } from "../player/index.js";
import { PlayerAbilityActor } from "./utils/helpers/ability/actor.js";
import { EnemyEntity, IAbility, IAbilityActiveContext, IAbilityActor, CombatManager, BASE_ATTACK_POWER } from "../../procedural-engine/index.js";
import { classifyAbility, isMultiTargetAbility, isSelfAbility, isSingleTargetEnemyAbility } from "./utils/helpers/encounter/ability-role.js";
import { CombatAction, CombatTarget } from "./utils/helpers/encounter/types.js";
import { EndRunState } from "./states/end/index.js";
import {
    IGameRoomEncounterContext,
    EncounterPhase,
    EncounterPublicState,
    InitiativeEntry,
} from "./utils/interface/encounter.js";

const AMBUSH_DC_BASE = 10;
const AMBUSH_ROLL_SIDES = 20;
const AMBUSH_STAT_DIVISOR = 4;

export class GameRoomEncounterManager implements IGameRoomEncounterContext {
    private readonly context: IGameRoomContext;

    private phase: EncounterPhase = "";
    private round: number = 0;
    private currentTurnIndex: number = -1;
    private initiative: InitiativeEntry[] = [];

    private enemies: EnemyEntity[] = [];

    private playerActions: Record<string, CombatAction | null> = {};
    private playerTargets: Record<string, CombatTarget> = {};

    private defendingPlayerIds: Set<string> = new Set();
    private log: string[] = [];

    constructor(context: IGameRoomContext) {
        this.context = context;
    }


    public StartEncounter(enemies: EnemyEntity[]): void {
        this.enemies = enemies;
        for (const enemy of enemies) enemy.ResetHealth();
        this.phase = "vote";
        this.round = 0;
        this.currentTurnIndex = -1;
        this.initiative = [];
        this.playerActions = {};
        this.playerTargets = {};
        this.defendingPlayerIds = new Set();
        this.log = [];

        this.pushLog(`${enemies.length} foes bar the way. The party decides: battle or ambush?`);

        this.context.Vote.Start(
            "Foes Bar the Way",
            "The party must choose their approach.",
            [
                { id: "battle", name: "Battle", description: "Face the foes head-on." },
                { id: "ambush", name: "Ambush", description: "Strike from the shadows." },
            ],
            "majority",
            (winnerId) => this.resolveApproach(winnerId === "battle"),
        );

        this.context.Broadcaster.RoomUpdate();
    }

    public SubmitAction(player: Player, action: CombatAction): boolean {
        if (this.phase !== "combat") return false;
        if (!this.isPlayerTurn(player)) return false;
        if (player.Combat.Health.CurrentHealth <= 0) return false;

        if (action.type !== "attack" && action.type !== "ability" && action.type !== "defend") {
            return false;
        }

        if (action.type === "ability") {
            if (!action.abilityId) return false;
            if (!this.isActiveAbility(player, action.abilityId)) return false;
        }

        this.playerActions[player.Identity.playerPublicId] = action;

        if (!this.needsTarget(action, player)) {
            this.playerTargets[player.Identity.playerPublicId] = { kind: "self" };
            this.resolvePlayerTurn(player);
        }

        this.context.Broadcaster.RoomUpdate();
        return true;
    }

    public SubmitTarget(player: Player, target: CombatTarget): boolean {
        if (this.phase !== "combat") return false;
        if (!this.isPlayerTurn(player)) return false;

        const action = this.playerActions[player.Identity.playerPublicId];
        if (!action || !this.needsTarget(action, player)) return false;

        if (!this.isValidTarget(player, action, target)) return false;

        this.playerTargets[player.Identity.playerPublicId] = target;
        this.resolvePlayerTurn(player);
        this.context.Broadcaster.RoomUpdate();
        return true;
    }

    public OnPlayerDisconnect(playerId: string): void {
        const player = this.context.Party.Players.find((p) => p.Identity.playerId === playerId);
        if (!player) return;

        delete this.playerActions[player.Identity.playerPublicId];
        delete this.playerTargets[player.Identity.playerPublicId];
        this.defendingPlayerIds.delete(player.Identity.playerPublicId);
    }

    public get Active(): boolean {
        return this.phase !== "";
    }

    public get Phase(): EncounterPhase {
        return this.phase;
    }

    public get State(): EncounterPublicState {
        const current = this.currentTurnIndex >= 0 ? this.initiative[this.currentTurnIndex] : null;
        return {
            active: this.phase !== "",
            phase: this.phase,
            round: this.round,
            currentTurnId: current?.id ?? null,
            currentTurnKind: current?.kind ?? null,
            initiative: this.initiative.map((e) => ({ ...e })),
            playerActions: { ...this.playerActions },
            playerTargets: { ...this.playerTargets },
            log: [...this.log],
            enemies: this.enemies.map((e) => ({
                id: e.id,
                name: e.name,
                threatLevel: e.threatLevel,
                currentHealth: e.Health.CurrentHealth,
                maxHealth: e.Health.MaxHealth,
                alive: CombatManager.IsAlive(e),
                defending: false,
            })),
        };
    }

    // ── Approach resolution ─────────────────────────────────

    private resolveApproach(battle: boolean): void {
        if (battle) {
            this.pushLog("The party advances to open battle.");
            this.startCombat();
            return;
        }

        this.pushLog("The party attempts to ambush the foes.");
        if (this.rollAmbush()) {
            for (const enemy of this.enemies.filter((e) => CombatManager.IsAlive(e))) {
                CombatManager.Kill(enemy);
            }
            this.pushLog("The ambush succeeds — the foes are put down before they can react.");
            this.finishEncounter(true, { ambush: true });
            return;
        }

        this.pushLog("The ambush fails — the foes are alerted and battle begins.");
        this.startCombat();
    }

    private rollAmbush(): boolean {
        const players = this.context.Party.Players;
        if (players.length === 0) return false;

        const partyAvg =
            players.reduce((sum, p) => {
                const eff = p.Combat.EffectiveStats;
                return sum + (eff.agility + eff.strength);
            }, 0) / players.length / AMBUSH_STAT_DIVISOR;

        const dc = AMBUSH_DC_BASE + this.totalThreat();
        const roll = this.roll(1, AMBUSH_ROLL_SIDES);
        const success = roll + partyAvg >= dc;

        this.pushLog(`Ambush roll: ${roll} + ${Math.floor(partyAvg)} vs DC ${dc} — ${success ? "success" : "failure"}.`);
        return success;
    }

    private roll(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private totalThreat(): number {
        return this.enemies.reduce((sum, e) => sum + e.threatLevel, 0);
    }

    // ── Combat setup ───────────────────────────────────────

    private startCombat(): void {
        this.phase = "combat";
        this.round = 1;
        this.playerActions = {};
        this.playerTargets = {};
        this.defendingPlayerIds = new Set();

        const entries: InitiativeEntry[] = [];

        for (const player of this.context.Party.Players) {
            entries.push({
                kind: "player",
                id: player.Identity.playerPublicId,
                name: player.Identity.name,
                speed: player.Combat.EffectiveStats.agility,
                alive: player.Combat.Health.CurrentHealth > 0,
            });
        }

        for (const enemy of this.enemies) {
            entries.push({
                kind: "enemy",
                id: enemy.id,
                name: enemy.name,
                speed: enemy.EffectiveStats.agility,
                alive: CombatManager.IsAlive(enemy),
            });
        }

        entries.sort((a, b) => b.speed - a.speed);

        this.initiative = entries;
        this.currentTurnIndex = 0;

        this.pushLog("Combat begins.");
        this.processCurrentTurn();
        this.context.Broadcaster.RoomUpdate();
    }

    private processCurrentTurn(): void {
        if (this.phase !== "combat") return;

        let visited = 0;
        while (this.phase === "combat" && visited <= this.initiative.length) {
            visited++;
            const entry = this.initiative[this.currentTurnIndex];
            if (!entry) {
                this.finishEncounter(false);
                return;
            }

            this.clearDefenseFor(entry);

            if (entry.kind === "enemy") {
                const enemy = this.enemies.find((e) => e.id === entry.id);
                if (enemy && CombatManager.IsAlive(enemy)) {
                    this.executeEnemyTurn(enemy);
                    this.advanceTurn();
                    this.checkEncounterEnd();
                } else {
                    this.advanceTurn();
                }
                if (this.phase !== "combat") return;
                continue;
            }

            if (entry.kind === "player") {
                const player = this.context.Party.getPlayerByPublicId(entry.id);
                if (player && player.Combat.Health.CurrentHealth > 0) {
                    // It is this player's turn: wait for their action.
                    return;
                }
            }

            // Dead or gone: skip.
            this.playerActions[entry.id] = null;
            this.advanceTurn();
        }

        this.finishEncounter(false);
    }

    private advanceTurn(): void {
        this.currentTurnIndex++;
        if (this.currentTurnIndex >= this.initiative.length) {
            this.round++;
            this.currentTurnIndex = 0;
        }
    }

    private clearDefenseFor(entry: InitiativeEntry): void {
        if (entry.kind === "player") {
            this.defendingPlayerIds.delete(entry.id);
        }
    }

    private isPlayerTurn(player: Player): boolean {
        if (this.phase !== "combat") return false;
        const entry = this.initiative[this.currentTurnIndex];
        return entry?.kind === "player" && entry.id === player.Identity.playerPublicId;
    }

    // ── Turn resolution ────────────────────────────────────

    private needsTarget(action: CombatAction, player: Player): boolean {
        if (action.type === "attack") return true;
        if (action.type === "defend") return false;
        if (action.type === "ability") {
            const ability = this.getActiveAbilityById(player, action.abilityId!);
            if (!ability) return false;
            if (isSelfAbility(ability) || isMultiTargetAbility(ability)) return false;
            return true;
        }
        return false;
    }

    private isValidTarget(player: Player, action: CombatAction, target: CombatTarget): boolean {
        if (action.type === "attack") {
            return this.isAliveEnemyTarget(target);
        }
        if (action.type === "ability" && action.abilityId) {
            const ability = this.getActiveAbilityById(player, action.abilityId);
            if (!ability) return false;
            if (isSelfAbility(ability) || isMultiTargetAbility(ability)) return true;
            if (isSingleTargetEnemyAbility(ability)) {
                return this.isAliveEnemyTarget(target);
            }
            // single-target ally ability
            if (target.kind === "self") return true;
            if (target.kind === "ally") {
                const ally = this.context.Party.getPlayerByPublicId(target.id);
                return !!ally && ally.Combat.Health.CurrentHealth > 0;
            }
            return false;
        }
        return false;
    }

    private isAliveEnemyTarget(target: CombatTarget): boolean {
        if (target.kind !== "enemy") return false;
        const enemy = this.enemies.find((e) => e.id === target.id);
        return !!enemy && CombatManager.IsAlive(enemy);
    }

    private resolvePlayerTurn(player: Player): void {
        const action = this.playerActions[player.Identity.playerPublicId];
        const target = this.playerTargets[player.Identity.playerPublicId];
        if (!action) return;

        switch (action.type) {
            case "attack": {
                const targetEnemy = this.resolveAttackEnemy(target);
                if (targetEnemy) {
                    this.resolvePlayerAttack(player, targetEnemy);
                }
                break;
            }
            case "ability": {
                this.resolvePlayerAbility(player, action, target);
                break;
            }
            case "defend": {
                this.defendingPlayerIds.add(player.Identity.playerPublicId);
                this.pushLog(`${player.Identity.name} braces to defend.`);
                break;
            }
        }

        this.playerActions[player.Identity.playerPublicId] = null;
        this.playerTargets[player.Identity.playerPublicId] = { kind: "self" };
        this.advanceTurn();
        this.checkEncounterEnd();
        if (this.phase === "combat") {
            this.processCurrentTurn();
        }
    }

    private resolveAttackEnemy(target: CombatTarget | undefined): EnemyEntity | undefined {
        if (!target || target.kind !== "enemy") return undefined;
        return this.enemies.find((e) => e.id === target.id);
    }

    private resolvePlayerAttack(player: Player, enemy: EnemyEntity): void {
        const atkStats = player.Combat.EffectiveStats;
        const physical = atkStats.strength >= atkStats.intelligence;
        const kind = physical ? "physical" : "magical";
        const damage = CombatManager.DealDamage(player.Combat, enemy, kind, BASE_ATTACK_POWER);
        this.pushLog(
            `${player.Identity.name} ${physical ? "strikes" : "casts on"} ${enemy.name} for ${damage} damage (${enemy.Health.CurrentHealth}/${enemy.Health.MaxHealth} hp).`,
        );
    }

    private resolvePlayerAbility(player: Player, action: CombatAction, target: CombatTarget | undefined): void {
        const ability = this.getActiveAbilityById(player, action.abilityId!);
        if (!ability) return;

        const actorHandle = new PlayerAbilityActor(player);
        const allies = this.context.Party.Players
            .filter((p) => p.Identity.playerId !== player.Identity.playerId)
            .map((p) => new PlayerAbilityActor(p));

        let targets: IAbilityActor[] = this.buildPlayerTargets(ability, target, actorHandle, allies);

        const abilityContext: IAbilityActiveContext = {
            actor: actorHandle,
            allies,
            targets,
            targeting: ability.targeting,
        };

        const reports: string[] = [];
        for (const component of ability.components.filter((c) => c.type === "active")) {
            const report = component.onExecute(abilityContext);
            reports.push(String(report));
        }

        this.pushLog(`${player.Identity.name} uses ${ability.name}: ${reports.join("; ")}.`);
    }

    private buildPlayerTargets(
        ability: IAbility,
        target: CombatTarget | undefined,
        actor: IAbilityActor,
        allies: IAbilityActor[],
    ): IAbilityActor[] {
        if (isSelfAbility(ability)) return [actor];
        if (isMultiTargetAbility(ability)) {
            return ability.targeting.kind === "enemy" ? allies : allies.length ? allies : [actor];
        }
        if (target?.kind === "ally") {
            const ally = this.context.Party.getPlayerByPublicId(target.id);
            return ally ? [new PlayerAbilityActor(ally)] : allies.length ? allies : [actor];
        }
        if (target?.kind === "enemy") {
            const enemy = this.enemies.find((e) => e.id === target.id);
            return enemy ? [enemy] : [];
        }
        return allies.length ? allies : [actor];
    }

    private executeEnemyTurn(enemy: EnemyEntity): void {
        const action = this.pickEnemyAction(enemy);
        if (!action) {
            this.executeEnemyAttack(enemy);
            return;
        }

        if (action.type === "ability" && action.abilityId) {
            this.resolveEnemyAbility(enemy, action.abilityId);
            return;
        }

        this.executeEnemyAttack(enemy);
    }

    private pickEnemyAction(enemy: EnemyEntity): { type: "ability"; abilityId: string } | { type: "attack" } {
        const abilities = enemy.abilities.filter(this.isExecutableActiveAbility);

        const hpPct = enemy.Health.MaxHealth > 0 ? enemy.Health.CurrentHealth / enemy.Health.MaxHealth : 0;

        if (this.round === 1) {
            const buff = abilities.find((a) => classifyAbility(a) === "buff");
            if (buff) return { type: "ability", abilityId: buff.id };
        }

        if (hpPct < 0.3) {
            const heal = abilities.find((a) => classifyAbility(a) === "heal");
            if (heal) return { type: "ability", abilityId: heal.id };
        }

        const damage = abilities.find((a) => classifyAbility(a) === "attack");
        if (damage) return { type: "ability", abilityId: damage.id };

        return { type: "attack" };
    }

    private isExecutableActiveAbility = (ability: IAbility): boolean => {
        return ability.components.some((c) => c.type === "active");
    };

    private resolveEnemyAbility(enemy: EnemyEntity, abilityId: string): void {
        const ability = enemy.abilities.find((a) => a.id === abilityId);
        if (!ability) return;

        const allies = this.enemies.filter((e) => e.id !== enemy.id && CombatManager.IsAlive(e));
        const playerActors: IAbilityActor[] = this.context.Party.Players
            .filter((p) => p.Combat.Health.CurrentHealth > 0)
            .map((p) => new PlayerAbilityActor(p));

        let targets: IAbilityActor[] = [];
        if (isSelfAbility(ability)) {
            targets = [enemy];
        } else if (isMultiTargetAbility(ability)) {
            targets = playerActors;
        } else {
            targets = playerActors.length
                ? [playerActors[this.roll(0, playerActors.length - 1)]!]
                : [];
        }

        const abilityContext: IAbilityActiveContext = {
            actor: enemy,
            allies,
            targets,
            targeting: ability.targeting,
        };

        const reports: string[] = [];
        for (const component of ability.components.filter((c) => c.type === "active")) {
            const report = component.onExecute(abilityContext);
            reports.push(String(report));
        }

        this.pushLog(`${enemy.name} uses ${ability.name}: ${reports.join("; ")}.`);
        this.context.Broadcaster.RoomUpdate();
    }

    private executeEnemyAttack(enemy: EnemyEntity): void {
        const target = this.chooseEnemyAttackTarget();
        if (!target) return;

        const atkStats = enemy.EffectiveStats;
        const physical = atkStats.strength >= atkStats.intelligence;
        const kind = physical ? "physical" : "magical";
        const damage = CombatManager.DealDamage(enemy, target.Combat, kind, BASE_ATTACK_POWER);
        this.pushLog(`${enemy.name} ${physical ? "attacks" : "casts on"} ${target.Identity.name} for ${damage} damage.`);
    }

    private chooseEnemyAttackTarget(): Player | undefined {
        const alive = this.context.Party.Players.filter((p) => p.Combat.Health.CurrentHealth > 0);
        if (alive.length === 0) return undefined;

        const nonDefending = alive.filter((p) => !this.defendingPlayerIds.has(p.Identity.playerPublicId));
        const pool = nonDefending.length > 0 ? nonDefending : alive;
        return pool[this.roll(0, pool.length - 1)];
    }

    private isActiveAbility(player: Player, abilityId: string): boolean {
        return player.Abilities.ActiveAbilityIds.includes(abilityId);
    }

    private getActiveAbilityById(player: Player, abilityId: string): IAbility | undefined {
        return player.Abilities.getAbilityById(abilityId);
    }

    private checkEncounterEnd(): void {
        const enemiesAlive = this.enemies.some((e) => CombatManager.IsAlive(e));
        const connected = this.connectedPlayers();
        const connectedAlive = connected.some((p) => p.Combat.Health.CurrentHealth > 0);

        if (!enemiesAlive) {
            this.finishEncounter(true);
            return;
        }
        if (connected.length > 0 && !connectedAlive) {
            this.finishEncounter(false, { endOfRun: true });
        }
    }

    private connectedPlayers(): Player[] {
        return this.context.Party.Players.filter(
            (p) => p.status !== "disconnected" && p.status !== "left" && p.status !== "joined",
        );
    }

    private finishEncounter(victory: boolean, opts: { ambush?: boolean; endOfRun?: boolean } = {}): void {
        this.phase = "";
        this.initiative = [];
        this.currentTurnIndex = -1;
        this.round = 0;

        const enemiesDead = !this.enemies.some((e) => CombatManager.IsAlive(e));

        let outcome: string;
        if (victory) {
            this.pushLog("All foes are vanquished. The way is clear.");
            this.context.Map.MarkRoomCleared();
            this.context.Map.UnlockEventless();
            outcome = opts.ambush
                ? enemiesDead
                    ? "The ambush lands cleanly — the foes are struck down before they can raise a cry, and the way ahead lies open."
                    : "The ambush carries the room without open battle, and the way ahead lies open."
                : enemiesDead
                    ? "The last foe falls, and the way ahead lies open. The party has triumphed."
                    : "Without bloodshed the foes are overcome, and the way ahead lies open. The party has triumphed.";
        } else {
            this.pushLog("The party has been overwhelmed.");
            outcome = "The survivors of the fray pull back, battered and bloodied. The party has been overwhelmed.";
        }

        this.context.Broadcaster.RoomUpdate();

        const narration = this.context.Resolver.NarrateEncounterOutcome(outcome, { enemiesDead });
        if (opts.endOfRun) {
            narration.then(() => this.context.StateMachine.TransitionTo(new EndRunState(this.context)));
        }
    }

    private pushLog(message: string): void {
        this.log.push(message);
        if (this.log.length > 40) {
            this.log.shift();
        }
    }
}
