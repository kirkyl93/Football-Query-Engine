import {useEffect, useMemo, useState} from "react";
import {PlayerAppearance, PlayerFilterState, PlayerSeasonsCompetitionsAndClubs} from "../../../types/Player";
import {AppearanceTypeOptions, HomeOrAwayOptions} from "../../../types/SearchOptions";
import {EventType} from "../../../types/Player";
import {filterAppearances} from "../lib/appearancesFilter";
import {createDefaultMetadata, extractAppearancesMetadata} from "../lib/appearancesMetadata";

export const createDefaultPlayerFilterState = (): PlayerFilterState => ({
    selectedSeasons: [],
    selectedCompetitions: [],
    selectedClubsPlayedFor: [],
    selectedClubsPlayedAgainst: [],
    selectedHomeOrAway: HomeOrAwayOptions.EITHER,
    selectedAppearanceType: AppearanceTypeOptions.EITHER,
    selectedEvents: {
        [EventType.Goals]: false,
        [EventType.Penalties]: false,
        [EventType.OwnGoals]: false,
        [EventType.Assists]: false,
        [EventType.CleanSheets]: false,
        [EventType.Yellows]: false,
        [EventType.Reds]: false
    }
});

interface UseAppearancesFilterResult {
    filteredData: PlayerAppearance[];
    playerFilterState: PlayerFilterState;
    setPlayerFilterState: (state: PlayerFilterState) => void;
    metadata: PlayerSeasonsCompetitionsAndClubs;
}

/**
 * Owns the game log, filter state and derived filtered data for one
 * appearances chart. The initial zoom range is derived by the zoom hook.
 */
export const useAppearancesFilter = (initialData: PlayerAppearance[] | undefined): UseAppearancesFilterResult => {
    const [data, setData] = useState<PlayerAppearance[]>(initialData || []);
    const [playerFilterState, setPlayerFilterState] = useState<PlayerFilterState>(createDefaultPlayerFilterState);
    const [metadata, setMetadata] = useState<PlayerSeasonsCompetitionsAndClubs>(createDefaultMetadata());

    useEffect(() => {
        if (initialData === undefined || !initialData.length) {
            return;
        }

        setData(initialData);

        const {finalSeason, ...rest} = extractAppearancesMetadata(initialData);

        setPlayerFilterState(prev => ({
            ...prev,
            selectedSeasons: [finalSeason],
        }));

        setMetadata(prev => ({
            ...prev,
            ...rest
        }));

    }, [initialData]);

    const filteredData = useMemo(() => filterAppearances(data, playerFilterState), [data, playerFilterState]);

    return {filteredData, playerFilterState, setPlayerFilterState, metadata};
};
