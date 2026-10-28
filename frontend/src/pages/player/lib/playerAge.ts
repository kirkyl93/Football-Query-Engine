/** Completed years on the match date, using date-only UTC values. */
export function ageOnMatchDate(dateOfBirth: string | undefined, matchDate: string): number | null {
    if (!dateOfBirth) return null;
    const birth = new Date(dateOfBirth + 'T00:00:00Z');
    const match = new Date(matchDate + 'T00:00:00Z');
    if (!Number.isFinite(birth.getTime()) || !Number.isFinite(match.getTime()) || match < birth) return null;
    const beforeBirthday = match.getUTCMonth() < birth.getUTCMonth()
        || (match.getUTCMonth() === birth.getUTCMonth() && match.getUTCDate() < birth.getUTCDate());
    return match.getUTCFullYear() - birth.getUTCFullYear() - Number(beforeBirthday);
}
