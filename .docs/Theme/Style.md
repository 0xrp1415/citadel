How the game looks and how the officer writes.

## Aesthetic — Grimoire Nocturna

- **Grimoire Nocturna** — a dark, violet-and-gold illuminated-manuscript feel; deep void surfaces, parchment body text, ornamental gold corner accents and flourishes
- **Cinzel** for headings and labels (uppercase, tracked); **EB Garamond** for body text; **JetBrains Mono** for codes, stats, and system type; **Playfair Display** for editorial drops
- Zero border-radius throughout; thin gold borders; subtle glow on hover states; frosted-glass modal scrims
- No CRT, scanlines, or phosphor — terminal imagery belongs only to the lore of the tablet's voice

## Palette — Grimoire Nocturna

### Surfaces

| Role | Hex | Notes |
|---|---|---|
| Void / background | `#0c0b0f` | deepest black-violet |
| Grimoire surface | `#181520` | panel and card ground |
| Raised surface | `#221c2e` | modals, elevated cards |

### Gold (primary accent)

| Role | Hex | Notes |
|---|---|---|
| Gold primary | `#d4af37` | borders, highlights, active states |
| Gold bright | `#f2ca50` | hover glow, cipher codes, player names |
| Gold patina | `#8a702b` | muted gold, subtle labels |

### Violet (secondary accent)

| Role | Hex | Notes |
|---|---|---|
| Astral violet | `#c084fc` | DM voice, officer markers, ability pings |
| Deep violet | `#3b0764` | violet backgrounds, chamber accents |

### Parchment (text)

| Role | Hex | Notes |
|---|---|---|
| Parchment | `#ece4d4` | primary body text |
| Parchment muted | `#cfc4b0` | secondary text |
| Parchment aged | `#9d9280` | labels, timestamps, muted UI |

### Combat / status

| Role | Hex | Notes |
|---|---|---|
| Foe red | `#dc2626` | enemy borders, danger, peril badges |
| Healing green | `#22c55e` | HP fill, rest indicators |

## Narration style

- **Voice** — the officer through the tablet: official, bureaucratic, dispassionate. Third person for scene narration; the officer judges, the tower acts. Neither hostile nor warm; he is doing a job.
- **Register** — descriptive, immersive prose for scene-setting; structured verdicts for action resolution. Outcomes are clear and scannable.
- **Scannable** — the field log shows each action and its result as distinct rows with colored left borders (gold for player, violet for DM, muted for system).
- **Validation as verdicts** — the DM returns structured JSON verdicts (`execute` / `not_allowed` / `ambiguous`); narration is produced as a second pass over the mechanical outcome.

### Field log rows

```
‹ rest                          (player action — gold border)
✦ A calm settles...            (DM narration — violet border)
‹ look around                   (player action — gold border)
✦ A cold, unseen hand...       (DM refusal — violet border)
```

### Combat display

Combat renders as a bento modal with:
- **Action buttons** — Attack, Defend, Ability (horizontal row)
- **Foe cards** — clickable targets when attacking; gold glow on hover
- **Target selection** — ally or enemy targeting for abilities
- **Combat log** — initiative order, damage dealt, effects applied
- **Vote modal** — during ambush decisions, keyboard-navigable with arrow keys

## UI structure

- **Gate** — sacred-geometry background, center inscription desk only, four gold corner accents
- **Chamber Nexus** — create or join paths; cipher input with violet accent
- **Staging Grounds** — chamber banner (cipher code, cadre count, quorum status, host name) + delver cards with corner accents, stat grids, HP bars; kit selection with keyboard navigation
- **The Descent** — three-column layout: foes | field log + composer | party; right rail with quickbar (Gear, Inventory, Player Sheet, Merchant); combat grid with clickable enemy cards; map modal with SVG dot-pattern background, circular room nodes, pixel-based connector lines, and a side panel for room details
- **Tactical Archive** — end-of-run summary with player stats, loot found, XP earned; accept-to-continue flow

## Modal system

All modals use a unified **bento** system:
- `bento-scrim` — frosted glass backdrop (`rgba(12, 11, 15, 0.82)` + `blur(4px)`)
- `bento` — modal container with `bento__head`, `bento__body`
- `bento-card` — selectable item/option cards
- `bento-tab` — tab navigation
- `bento-btn` — action buttons
- Keyboard: Escape closes, arrow keys navigate, Enter/Space selects

Related: [[Theme/Theme]] · [[Theme/Lore]]
