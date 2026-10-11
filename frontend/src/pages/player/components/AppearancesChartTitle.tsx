import {useMemo} from "react";
import {PlayerFilterState} from "../../../types/Player";
import {constructAppearancesTitle} from "../lib/appearancesTitleBuilders";
import TitleClubBadges from "../../../components/TitleClubBadges";
import shared from "../../../styles/shared.module.css";

interface GamesPlayedChartTitleProps {
    playerName: string;
    filterState: PlayerFilterState;
    /** Shows a "(zoom filter applied)" suffix while a zoom window is active. */
    hasZoomFilter?: boolean;
}

const AppearancesChartTitle: React.FC<GamesPlayedChartTitleProps> = (
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
            {hasZoomFilter && (
                <span className={shared['title-suffix']}> (zoom filter applied)</span>
            )}
            <TitleClubBadges label=" · PLAYING FOR:" clubIds={filterState.selectedClubsPlayedFor} />
            <TitleClubBadges label="· PLAYING AGAINST:" clubIds={filterState.selectedClubsPlayedAgainst} />
        </h4>
    )
}

export default AppearancesChartTitle
