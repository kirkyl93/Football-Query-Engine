import { AppearanceTypeOptions } from "../../../types/SearchOptions";
import { minMaxSummary } from "../../search/lib/filterSummaries";
import { appearanceTypeOptions, eventTypeOptions } from "./appearancesFilterOptions";
import type { EventSelection } from "./appearancesEventMapper";

/**
 * Collapsed-section summaries for the player filter drawer.
 * Empty string means "default / nothing set" and renders nothing.
 */
export const playerCompetitionSummary = (selectedCompetitions: string[]): string => {
    if (selectedCompetitions.length === 0) {
        return "";
    }
    if (selectedCompetitions.length === 1) {
        return selectedCompetitions[0];
    }
    return `${selectedCompetitions.length} comps`;
};

export const playerClubsForSummary = (
    selectedClubIds: number[],
    clubs: [number, string][],
): string => {
    if (selectedClubIds.length === 0) {
        return "";
    }
    if (selectedClubIds.length === 1) {
        return clubs.find((club) => club[0] === selectedClubIds[0])?.[1] ?? `#${selectedClubIds[0]}`;
    }
    return `${selectedClubIds.length} clubs`;
};

export const appearanceTypeSummary = (
    selectedAppearanceType: AppearanceTypeOptions,
    minimumMinutesPlayed: number | undefined,
    maximumMinutesPlayed: number | undefined,
): string => {
    const parts: string[] = [];
    if (selectedAppearanceType !== AppearanceTypeOptions.EITHER) {
        parts.push(
            appearanceTypeOptions.find((o) => o.id === selectedAppearanceType)?.name
                ?? selectedAppearanceType,
        );
    }
    const minutes = minMaxSummary(minimumMinutesPlayed, maximumMinutesPlayed, "'");
    if (minutes) {
        parts.push(minutes);
    }
    return parts.join(" · ");
};

export const eventsSummary = (selectedEvents: EventSelection): string => {
    const names = eventTypeOptions
        .filter((event) => selectedEvents[event.eventType])
        .map((event) => event.name);
    if (names.length === 0) {
        return "";
    }
    if (names.length <= 3) {
        return names.join(" + ");
    }
    return `${names.length} events`;
};
