import {useMemo} from "react";
import {PlayerFilterState} from "../../../types/Player";
import {constructAppearancesTitle} from "../lib/appearancesTitleBuilders";
import TitleClubBadges from "../../../components/TitleClubBadges";

interface GamesPlayedChartTitleProps {
    playerName: string;
    filterState: PlayerFilterState;
}

const AppearancesChartTitle: React.FC<GamesPlayedChartTitleProps> = (
    {
        playerName,
        filterState
    }) => {

    const constructTitle = useMemo((): string => {
        return constructAppearancesTitle(playerName, filterState);
    }, [filterState, playerName]);

    return (
        <h4 className="title">
            {constructTitle}
            <TitleClubBadges label=" · PLAYING FOR:" clubIds={filterState.selectedClubsPlayedFor} />
            <TitleClubBadges label="· PLAYING AGAINST:" clubIds={filterState.selectedClubsPlayedAgainst} />
        </h4>
    )
}

export default AppearancesChartTitle
