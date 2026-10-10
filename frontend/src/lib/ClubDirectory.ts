import {CLUBS} from "../data/Clubs";
import {getColour as getHashColour} from "./ColourUtils";
import {Club} from "../types/Club";

const SUGGESTION_DEFAULT_LIMIT = 10;

/** Normalise for search: lowercase, trim, strip diacritics (Köln -> koln). */
const normalize = (s: string): string =>
    s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

export function getClubName(clubId: number | string): string {
    const id = typeof clubId === "string" ? Number(clubId.trim()) : clubId;
    if (!Number.isFinite(id)) {
        return `Club ${clubId}`;
    }
    return CLUBS[id]?.name ?? `Club ${id}`;
}

/** 1-3 hex colours for a club. Falls back to the legacy hash colour. */
export function getClubColours(clubId: number | string): string[] {
    const id = typeof clubId === "string" ? Number(clubId.trim()) : clubId;
    if (!Number.isFinite(id)) {
        return [getHashColour(0)];
    }
    const colours = CLUBS[id]?.colours;
    if (colours && colours.length > 0) {
        return colours.slice(0, 3);
    }
    return [getHashColour(id)];
}

/** First colour — suitable for solid fills, badge washes, text accents. */
export function getClubPrimary(clubId: number | string): string {
    return getClubColours(clubId)[0];
}

/**
 * Local club search over the in-memory map. Returns Club-shaped results
 * so existing autocomplete UIs need no changes. Prefix matches rank first.
 */
export function searchClubs(query: string, limit: number = SUGGESTION_DEFAULT_LIMIT): Club[] {
    const q = normalize(query.trim());
    if (!q) {
        return [];
    }
    const prefix: Club[] = [];
    const contains: Club[] = [];
    for (const key of Object.keys(CLUBS)) {
        const id = Number(key);
        const name = CLUBS[id].name;
        const n = normalize(name);
        if (n.startsWith(q)) {
            prefix.push({club_id: id, name});
        } else if (n.includes(q)) {
            contains.push({club_id: id, name});
        }
        if (prefix.length >= limit) {
            break;
        }
    }
    const rank = (a: Club, b: Club) => a.name.localeCompare(b.name);
    prefix.sort(rank);
    contains.sort(rank);
    return [...prefix, ...contains].slice(0, Math.max(1, limit));
}
