export const ABILITY_TOKEN_PATTERN = /<#([A-Za-z0-9_]+)>/g;

export interface AbilityTokenResolution {
    stored: string;
    forDm: string;
}

export function resolveAbilityTokens(text: string, nameForId: (id: string) => string | undefined): AbilityTokenResolution {
    let stored = "";
    let forDm = "";
    let lastIndex = 0;
    const re = new RegExp(ABILITY_TOKEN_PATTERN.source, ABILITY_TOKEN_PATTERN.flags);
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
        stored += `<#${id}>`;
        forDm += name !== undefined ? name : `<#${id}>`;
        lastIndex = re.lastIndex;
    }
    stored += text.slice(lastIndex);
    forDm += text.slice(lastIndex);
    return { stored, forDm };
}