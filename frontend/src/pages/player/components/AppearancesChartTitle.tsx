import {useMemo} from "react";
import {PlayerFilterState} from "../../../types/Player";
import {constructAppearancesTitle} from "../lib/appearancesTitleBuilders";
import TitleClubBadges from "../../../components/TitleClubBadges";
import shared from "../../../styles/shared.module.css";

interface AppearancesChartTitleProps {
    playerName: string;
    filterState: PlayerFilterState;
    /** Shows a zoom suffix while a zoom window is active. */
    hasZoomFilter?: boolean;
}

const AppearancesChartTitle: React.FC<AppearancesChartTitleProps> = (
    {
        playerName,
        filterState,
        hasZoomFilter = false,
    }) => {

    const constructTitle = useMemo((): string => {
        return constructAppearancesTitle(playerName, filterState);
    }, [filterState, playerName]);

    return (
        <h4 className={shared['title']}>
            {constructTitle}
            <TitleClubBadges label="playing for" clubIds={filterState.selectedClubsPlayedFor} />
            <TitleClubBadges label="playing against" clubIds={filterState.selectedClubsPlayedAgainst} />
            {hasZoomFilter && (
                <span className={shared['title-suffix']}> (zoom filter applied)</span>
            )}
        </h4>
    )
}

export default AppearancesChartTitle
