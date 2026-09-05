import { DmVerdict, TRoomViewGenerator, TTranscriptEntry } from "./types.js";
import { ChatGroq } from "@langchain/groq";
import { config } from "dotenv";
import { RESOLVE_PROMPT } from "./prompt.js";
import { Resolve } from "./methods/resolve.js";
import { Narrate } from "./methods/narrate.js";


export type { TRoomViewGenerator }

export interface IDungeonMaster {
    Resolve(text: string, speaker: string): Promise<DmVerdict>;
    Narrate(eventText: string): Promise<string>;
    State: "idle" | "active";
    onStateChange?: (state: "idle" | "active") => void;
}

class DungeonMaster implements IDungeonMaster {
    private state: "idle" | "active" = "idle";
    private readonly roomViewGenerator: TRoomViewGenerator;

    private messages: TTranscriptEntry[] = [];
    private readonly resolveModel: ChatGroq;
    private readonly narrateModel: ChatGroq;
    public onStateChange?: (state: "idle" | "active") => void;

    constructor(roomViewGenerator: TRoomViewGenerator, resolveModel: ChatGroq, narrateModel: ChatGroq) {
        this.roomViewGenerator = roomViewGenerator
        this.resolveModel = resolveModel
        this.narrateModel = narrateModel
    }

    private setState(state: "idle" | "active"): void {
        this.state = state;
        this.onStateChange?.(state);
    }

    public async Resolve(text: string, speaker: string): Promise<DmVerdict> {
        if (this.state === "active") {
            return { status: "not_allowed", reason: "a command is already being resolved" };
        }

        this.setState("active");
        try {
            const roomView = await this.roomViewGenerator();
            const entry: TTranscriptEntry = { role: "player", text: text.toLowerCase().trim(), speaker };

            const verdict = await Resolve(this.resolveModel, roomView, this.messages, entry, RESOLVE_PROMPT);
            this.messages.push(entry);
            this.messages.push({ role: "dm", text: JSON.stringify(verdict) });
            if (this.messages.length > 20) {
                this.messages = this.messages.slice(-20);
            }
            return verdict;
        } finally {
            this.setState("idle");
        }
    }

    public async Narrate(eventText: string): Promise<string> {
        if (this.state === "active") {
            throw new Error("DungeonMaster is busy resolving another command");
        }
        this.setState("active");
        try {
            return await Narrate(this.narrateModel, eventText);
        } finally {
            this.setState("idle");
        }
    }


    public get State() {
        return this.state;
    }
}

const RESOLVE_TEMPERATURE = 0.5;
const NARRATE_TEMPERATURE = 0.2;

export function CreateDungeonMaster({ roomViewGenerator, onStateChange }: { roomViewGenerator: TRoomViewGenerator; onStateChange?: (state: "idle" | "active") => void }): IDungeonMaster {
    config();
    const resolveModel = new ChatGroq({
        model: "openai/gpt-oss-20b",
        apiKey: process.env.GROQ_API_KEY,
        temperature: RESOLVE_TEMPERATURE,
    });
    const narrateModel = new ChatGroq({
        model: "openai/gpt-oss-20b",
        apiKey: process.env.GROQ_API_KEY,
        temperature: NARRATE_TEMPERATURE,
    });

    const dm = new DungeonMaster(roomViewGenerator, resolveModel, narrateModel);
    dm.onStateChange = onStateChange;
    return dm;
}