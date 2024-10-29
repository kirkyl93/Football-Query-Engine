export function formatSeason(year: number) {
    const nextYear = (year + 1) % 100;
    return `${year}/${nextYear.toString().padStart(2, '0')}`;
}