How the run climbs and how sessions stay moving.

## Difficulty

- Dungeons escalate with **dungeon index** — each cleared dungeon leads to a harder one
- Encounters scale with **party size** — bigger parties face stronger opposition
- The descent is **endless** — the run ends only when the whole party is wiped

## Pacing

- A typical run lands around **20–30 minutes** before the wipe, but length is set by survival, not a fixed count
- **Turn-based** — the party advances when every connected player (live socket) votes yes
- No host force-advance and no per-turn timer — disconnects are handled by socket-level auto-removal, not round timeouts
- Narration follows each event as it resolves (single-shot, not streamed)
- Every dungeon starts at a stasis rest point, with extra graces in between ([[Mechanics/Stasis]])

## Design intent

- Runs are snappy enough to replay in an evening
- Difficulty spikes with each dungeon so survival feels earned
- Nothing in the run should wait on a single person for long

See also: [[Mechanics/Mechanics]] · [[Architecture/Game Flow]]
