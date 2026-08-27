import { ChatGroq } from "@langchain/groq";
import { DmVerdict, TTranscriptEntry } from "../types.js";
import { DmRoomView, ZDmVerdict } from "../schema/index.js";
import { SystemMessage, AIMessage, HumanMessage, type BaseMessage } from "langchain";

export function convertToRoomView(view: DmRoomView): string {
    const lines: string[] = [];

    lines.push(`ROOM #${view.roomId} (${view.roomType})`);

    const dirs = ["left", "right", "up", "down"] as const;
    lines.push("EXITS:");
    for (const d of dirs) {
        const exit = view.exits[d];
        if (!exit) { lines.push(`- ${d}: none`); continue; }
        const eve = exit.event ? `${exit.event.type}${exit.event.requiredStat ? "/" + exit.event.requiredStat : ""}` : "";
        lines.push(`- ${d}: room #${exit.targetRoomId}${eve ? " (" + eve + ")" : ""} ${exit.unlocked ? "open" : "locked"}`);
    }

    lines.push("PARTY:");
    if (view.party.length === 0) lines.push("- (empty)");
    for (const p of view.party) {
        const c = p.consumables;
        lines.push(
            `- ${p.id} | ${p.name} | ${p.alive ? "alive" : "dead"} | hp ${p.hp}/${p.maxHp}` +
            ` | lvl ${p.level} | gold ${p.gold}` +
            ` | potions:${c.health_potion} keys:${c.gold_key} picks:${c.lockpick}`
        );
    }

    return lines.join("\n");
}

export function createSystemMessage(system_prompt: string, room_snapshot: DmRoomView): SystemMessage {
    const room_snapshot_str = convertToRoomView(room_snapshot);
    return new SystemMessage({ content: system_prompt + "\n\n" + room_snapshot_str });
}

export function buildResolveMessages(
    system_prompt: string,
    room: DmRoomView,
    transcript: TTranscriptEntry[],
    incoming: TTranscriptEntry,
): BaseMessage[] {
    const messages: BaseMessage[] = [createSystemMessage(system_prompt, room)];

    for (const entry of transcript.slice(-5)) {
        if (entry.role === "player") {
            messages.push(new HumanMessage({ content: entry.text }));
        } else {
            messages.push(new AIMessage({ content: entry.text }));
        }
    }

    messages.push(new HumanMessage({ content: incoming.text }));

    return messages;
}

export async function Resolve(model: ChatGroq, room: DmRoomView, transcript: TTranscriptEntry[], incoming: TTranscriptEntry, system_prompt: string): Promise<DmVerdict> {
    try {
        return await model.withStructuredOutput(ZDmVerdict, { method: "jsonMode" }).invoke(buildResolveMessages(system_prompt, room, transcript, incoming));
    } catch (error) {
        if (error instanceof Error && (error as { lc_error_code?: string }).lc_error_code === "OUTPUT_PARSING_FAILURE") {
            return { status: "not_allowed", reason: "the command could not be interpreted" };
        }
        throw error;
    }
}