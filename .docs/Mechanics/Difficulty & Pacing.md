How the run climbs and how sessions stay moving.

## Difficulty

- Dungeons escalate with **dungeon index** — each cleared dungeon leads to a harder one
- Encounters scale with **party size** — bigger parties face stronger opposition
- Enemy **threat levels** (1–3) scale stats and XP rewards
- The descent is **endless** — the run ends only when the whole party is wiped

## Pacing

- A typical run lands around **20–30 minutes** before the wipe, but length is set by survival, not a fixed count
- **Turn-based** — each living player takes one action per turn in initiative order
- **Room advancement** requires a party vote — every connected player must vote yes
- No host force-advance and no per-turn timer — disconnects are handled by socket-level auto-removal
- Narration follows each event as it resolves (single-shot, not streamed)
- Every dungeon starts at a grace rest point, with extra graces in between ([[Mechanics/Stasis]])

## Run end

- A wipe (all downed) ends the run — it's the **only way** a run ends
- The party sees the **Tactical Archive** — a summary of the run with stats, rewards, and player contributions
- All players must accept to return to the lobby for another run

## Design intent

- Runs are snappy enough to replay in an evening
- Difficulty spikes with each dungeon so survival feels earned
- Nothing in the run should wait on a single person for long

See also: [[Mechanics/Mechanics]] · [[Architecture/Game Flow]]
