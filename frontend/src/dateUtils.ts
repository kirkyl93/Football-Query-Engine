export function formatSeason(year: number) {
    const nextYear = (year + 1) % 100;
    return `${year}/${nextYear.toString().padStart(2, '0')}`;
}

export function convertDateStringToDate(dateString: string): Date {
    if (!dateString || dateString.length < 0) {
        return new Date();
    }

    return new Date(`${dateString}T00:00:00Z`);
}

export const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});