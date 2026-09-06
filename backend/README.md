# Citadel Backend

The Citadel server — a Node.js + Express + Socket.io service written in TypeScript. Single process for the MVP.

## Prerequisites

- **Node.js** ≥ 22
- **pnpm** ≥ 11 (the `allowBuilds` setting in `pnpm-workspace.yaml` requires it)

## Setup

```sh
pnpm install
```

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Runs `tsx src/index.ts` via **nodemon** (config in `nodemon.json`), auto-restarts on `src/**/*.ts` changes |
| `pnpm build` | Compiles TypeScript to `backend/dist/` with `tsc` |
| `pnpm start` | Runs the built output: `node dist/index.js` |
| `pnpm typecheck` | Type-checks without emitting: `tsc --noEmit` |

## Run it

```sh
pnpm install
pnpm dev
```

The server listens on `http://localhost:3000` (override with the `PORT` env var).

> `pnpm start` runs the compiled `dist/`, so run `pnpm build` first on a fresh clone.

Verify it's up:

```
curl http://localhost:3000/health
# {"ok":true,"service":"citadel-backend"}
```

Socket.io clients connect to the same origin (`/socket.io`).

## Folder structure

```
backend/
  .env                    # GROQ_API_KEY, PORT (not committed)
  .env.example            # env template
  .gitignore              # ignores node_modules/, dist/, .env, logs
  nodemon.json            # dev config: watch src/, ext ts, exec tsx src/index.ts
  package.json            # ESM ("type": "module"), scripts, dependencies
  pnpm-lock.yaml          # lockfile
  pnpm-workspace.yaml     # pnpm 11 settings (allowBuilds: esbuild)
  tsconfig.json           # strict TS, ESM (NodeNext), outDir dist/
  src/
    index.ts              # app entry: Express + /health + Socket.io on :3000

    utils/
      hmac/
        sign.ts           # HMAC signature generation for room tokens
        verify.ts         # HMAC signature verification

    domains/
      user/               # identity + auth
        index.ts          # exports CreateUserDomain
        types.ts          # TUser
        repository.ts     # in-memory user store
        service.ts        # register / identify logic
        controller.ts     # Express router (POST /user/register, /user/identify)
        middleware.ts      # auth middleware (extracts user from token)

      game-room/          # the authoritative game session
        index.ts          # exports CreateGameRoomDomain
        types.ts          # GameRoomPublicData, RunSummary, RunSummaryPlayer
        tokens.ts         # JWT-like room token sign/verify (HMAC-based)
        service.ts        # create/join/leave room, action dispatch
        controller.ts     # Express router (POST /room/create, /room/join, /room/leave, /room/action)
        socket.ts         # Socket.io event handlers (connect, disconnect, action)
        repository.ts     # in-memory room store

        player/           # player character model
          index.ts        # CreatePlayer — factory with all player methods
          types.ts        # PlayerRunEntity, PlayerLobbyEntity, PlayerStatus, IItem
          identity.ts     # playerId, name, lobby presence
          defaults.ts     # DefaultGold (200), DefaultStartingInventory, base stats
          inventory.ts    # addItem, removeItem, equip, unequip, use consumable
          abilities.ts    # grant/learn abilities, setActiveAbility, ability token resolution
          combat.ts       # HP/damage/heal, stat mods, death/faint tracking
          progression.ts  # XP awards, level-up, stat point allocation
          kits.ts         # 5 starter kits (Vanguard, Blade, Shadow, Arcane, Wanderer)
          socket.ts       # player socket state (connection tracking)

        room/             # room + run lifecycle
          index.ts        # GameRoom class — owns players, map, state machine, encounter, DM
          types.ts        # IRoomMetadata, IRunState, IEncounterState, IPlayerMove
          identity.ts     # roomId, inviteCode, hostId
          broadcaster.ts  # SetRunSummary, SetAcceptedPlayers, BroadcastEncounter, BroadcastMap, Reset
          dm-adapter.ts   # translates GameRoom state → DM room snapshot
          encounter.ts    # combat encounter: initiative, turns, enemy AI, ambush, loot drops, XP awards
          map.ts          # GameRoomMap: seed, rooms, droppedItems, merchant stock, CreateRng
          party.ts        # party management: add/remove/ready players
          resolver.ts     # action dispatch: routes parsed actions to resolvers
          state-machine.ts # lobby → run → end state transitions
          vote.ts         # GameRoomVoteManager: vote creation, tallying, deadline, auto-resolve

          states/
            base/
              index.ts    # base state class with shared context
              shared-actions.ts # cross-state actions (chat, ping)
            lobby/
              index.ts    # LobbyState: onEnter resets all run state
              config-actions.ts # host: set seed, difficulty, mapSize, maxPlayers
              game-flow-actions.ts # host: openGate (start run), vote to advance
              player-actions.ts # ready, kit selection, stat allocation, chat
            run/
              index.ts    # InRunState: accepts run actions (move, combat, rest, merchant, etc.)
              enter-room.ts # enterRoom: narration, ambush check, grace revival, room loot
              player-actions.ts # all run actions: move, rest, combat, equip, merchant, pick up, drop, vote
            end/
              index.ts    # EndRunState: run summary, accept-to-continue

          utils/
            defaults.ts   # room config defaults
            types.ts      # shared utility types
            helpers/
              ability/
                actor.ts  # ability targeting: self, ally, foe, all_foes, all_allies
              ability-tokens.ts # resolve ability tokens (cooldowns, charges)
              confirmation/ # confirmation flow (vote-based)
                index.ts
                actor.ts
                manager.ts
                resolver.ts
                types.ts
              encounter/
                ability-role.ts # ability role in combat (attacker, defender, support)
                types.ts
              map/
                exits.ts  # room exit generation and locking
                merchant-stock.ts # per-room merchant stock generation (potions + loot rolls)
                room-facts.ts # room type descriptions and lore
                serialize.ts # map serialization for frontend (fog of war)
              mentions.ts # @mention parsing in action text
            interface/    # TypeScript interfaces for room subsystems
              broadcaster.ts
              dm-adapter.ts
              encounter.ts
              identity.ts
              index.ts
              map.ts
              party.ts
              resolver.ts
              socket.ts
              state-machine.ts
              vote.ts
            methods/
              action-resolver/
                index.ts          # registry of all action resolvers
                resolve-ability.ts # use_ability action
                resolve-challenge.ts # trial/puzzle challenges
                resolve-look.ts   # look/inspect action
                resolve-move.ts   # movement between rooms
                resolve-rest.ts   # rest action (heal in grace rooms)
                resolve-use-item.ts # use consumable/scroll

      dungeon-master/     # AI: structure, judge, narrate
        index.ts          # CreateDungeonMaster — ChatGroq (openai/gpt-oss-20b)
        types.ts          # DmVerdict, TTranscriptEntry, TRoomViewGenerator
        prompt.ts         # RESOLVE_PROMPT, NARRATE_PROMPT system prompts
        methods/
          resolve.ts      # Resolve: free text → structured verdict (execute/not_allowed/ambiguous)
          narrate.ts      # Narrate: event text → in-world prose
        schema/           # Zod schemas for structured output
          index.ts        # exports DmRoomView, ZDmVerdict
          room.ts         # DmRoomView schema (room snapshot for DM)
          verdict.ts      # DmVerdict schema
          event.ts        # event schema
          actions/
            index.ts      # action schema barrel
            action.ts     # single action schema (intent, target, direction, resource)
            intent.ts     # action intent enum
            target.ts     # target type (self, ally, foe, all_foes, all_allies)
            direction.ts  # movement direction
            resource.ts   # resource type (potion, key, pick, gold)

      procedural-engine/  # all randomness and outcome math — pure, no I/O
        index.ts          # exports engine modules
        rng.ts            # MulberryRNG: seeded RNG with roll, pick, chance, fromSeed
        map.ts            # IMapMetadata, Map.CreateRng(), Map.DropItems(), Map.PickupItem()
        room.ts           # room generation from map metadata
        passage.ts        # passage event generation

        ability/          # ability system (97 abilities across 6 stat trees)
          index.ts        # exports ability modules
          interface.ts    # IAbility interface (name, description, components, targeting, cooldown)
          data/
            index.ts      # barrel export
            abilities/
              index.ts    # all abilities barrel
              registry.ts # ability registry (name → ability lookup)
              strength.ts # STR abilities
              dexterity.ts # DEX abilities
              agility.ts  # AGI abilities
              intelligence.ts # INT abilities
              wisdom.ts   # WIS abilities
              hp.ts       # HP abilities
            components/
              index.ts    # component barrel
              actives.ts  # active component definitions (damage, heal, buff, etc.)
              passives.ts # passive component definitions (stat bonuses, triggers)

        combat/           # combat system
          index.ts        # exports CombatManager
          manager.ts      # CombatManager: turn order, damage calc, status effects
          stats.ts        # stat calculation, modifiers, Pokemon-style damage formula
          entity/
            combat.ts     # combat entity (initiative, actions, status)
            health.ts     # HP tracking, faint/revive

        enemy/            # enemy definitions (99 enemies, 4 tiers)
          index.ts        # exports enemy modules
          interface.ts    # IEnemy interface
          entity.ts       # enemy entity (stats, abilities, AI behavior)
          builder.ts      # buildEnemy: scale by floor + party size
          registry.ts     # enemy registry (name → template)
          data/
            index.ts      # barrel export
            entity/
              index.ts    # all enemies barrel
              tier1.ts    # threat level 1 enemies
              tier2.ts    # threat level 2 enemies
              tier3.ts    # threat level 3 enemies
              tier4.ts    # threat level 4 enemies (bosses)
            ability/
              index.ts    # enemy abilities barrel
              components.ts # enemy ability components (attack patterns, spells)

        gear/             # gear catalog (80 items, 4 slots)
          index.ts        # exports gear modules
          interface.ts    # IGear interface (weapon, head, chest, greaves)
          data/
            index.ts      # barrel export
            weapon.ts     # weapons (stat bonuses, rarity, buy prices)
            head.ts       # head armor
            chest.ts      # chest armor
            greaves.ts    # leg armor
            components.ts # gear component definitions

        item/             # item system (gear, consumables, scrolls, loot tables)
          index.ts        # exports item modules
          base.ts         # IItem base interface (id, name, rarity, maxStackQty)
          gear.ts         # gear item wrapper
          consumable.ts   # consumable item (health potion, etc.)
          scroll.ts       # scroll item (grants an ability)
          data/
            index.ts      # barrel export
            registry.ts   # item registry (id → template)
            gear.ts       # all gear items
            consumables.ts # consumable definitions
            scrolls.ts    # scroll definitions (ability-granting items)
            loot-tables.ts # loot table system (depth-scaled rarity weights, rollLoot)

        generation/       # procedural dungeon generation
          config.ts       # map size, room count, floor depth config
          graph.ts        # room graph construction (nodes + edges)
          grid.ts         # BFS grid layout for frontend rendering
          connect.ts      # room connection/exits
          topology.ts     # graph diameter, shortest paths, boss placement
          room-types.ts   # room type assignment (grace, normal, boss, puzzle, etc.)
          encounters.ts   # encounter/passage event generation
          events.ts       # room events (combat, puzzle, challenge)
          secrets.ts      # secret room placement (dead-end branches)
```
