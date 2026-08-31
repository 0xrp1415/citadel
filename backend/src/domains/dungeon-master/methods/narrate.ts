import { ChatGroq } from "@langchain/groq";
import { SystemMessage, HumanMessage } from "langchain";
import { NARRATE_PROMPT } from "../prompt.js";

export async function Narrate(model: ChatGroq, eventText: string): Promise<string> {
    const res = await model.invoke(
        [new SystemMessage({ content: NARRATE_PROMPT }), new HumanMessage({ content: eventText })],
        { temperature: 0.2 },
    );
    return String(res.content);
}