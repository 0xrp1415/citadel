export const MENTION_PATTERN = /<@([A-Za-z0-9_-]+)>/g;

export interface MentionResolution {
    stored: string;
    forDm: string;
}

export function resolveMentions(text: string, nameForId: (id: string) => string | undefined): MentionResolution {
    let stored = "";
    let forDm = "";
    let lastIndex = 0;
    const re = new RegExp(MENTION_PATTERN.source, MENTION_PATTERN.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        const id = match[1];
        const prefix = text.slice(lastIndex, match.index);
        if (id === undefined) {
            lastIndex = re.lastIndex;
            continue;
        }
        const name = nameForId(id);
        stored += prefix;
        forDm += prefix;
        if (name !== undefined) {
            stored += `<@${id}>`;
            forDm += `@${name}`;
        } else {
            stored += `<@${id}>`;
            forDm += `<@${id}>`;
        }
        lastIndex = re.lastIndex;
    }
    stored += text.slice(lastIndex);
    forDm += text.slice(lastIndex);
    return { stored, forDm };
}
