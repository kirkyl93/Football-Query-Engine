import {competitions} from "../../../data/Competitions";
import {formatSeason} from "../../../lib/DateUtils";
import {useMemo} from "react";
import {PlayerFilterState} from "../../../types/Player";
import {HomeOrAwayOptions} from "../../../types/SearchOptions";

interface GamesPlayedChartTitleProps {
    playerName: string;
    filterState: PlayerFilterState;
}

const AppearancesChartTitle: React.FC<GamesPlayedChartTitleProps> = (
    {
        playerName,
        filterState
    }) => {

    const competitionsTitle = (): string => {
        if (filterState.selectedCompetitions.length === 0) {
            return "ALL COMPS";
        }

        if (filterState.selectedCompetitions.length >= 10) {
            return filterState.selectedCompetitions.length + " COMPS";
        }

        const competitionNames = filterState.selectedCompetitions.map(compName => {
            const leagueComp = competitions.leagues.find(comp => comp.name === compName);
            if (leagueComp) {
                return leagueComp.name.toUpperCase();
            }
            const euroComp = competitions.europeanCompetitions.find(comp => comp.name === compName);
            return euroComp ? euroComp.name.toUpperCase() : compName;
        });
        return competitionNames.join(" + ");
    }

    const seasonsTitle = (): string => {
        if (filterState.selectedSeasons.length === 0) {
            return "ALL SEASONS";
        }

        if (filterState.selectedSeasons.length === 1) {
            return formatSeason(filterState.selectedSeasons[0]);
        }

        const seasons = filterState.selectedSeasons.sort((a, b) => a - b);
        const isConsecutive = seasons.every((season, index, arr) => index === 0 || season - arr[index - 1] === 1);

        if (isConsecutive) {
            return formatSeason(filterState.selectedSeasons[0]) + "-" + formatSeason(filterState.selectedSeasons[filterState.selectedSeasons.length - 1]);
        }

        if (seasons.length >= 10) {
            return filterState.selectedSeasons.length + " SEASONS";
        }

        const formattedSeasons = filterState.selectedSeasons.sort((a, b) => a - b).map(season => formatSeason(season));
        return formattedSeasons.join(" · ");
    }

    const homeOrAwayTitle = (): string => {
        if (filterState.selectedHomeOrAway === HomeOrAwayOptions.HOME) {
            return " · AT HOME";
        }

        if (filterState.selectedHomeOrAway === HomeOrAwayOptions.AWAY) {
            return " · AWAY FROM HOME";
        }

        return "";
    }

    const constructTitle = useMemo((): string => {
        let title = playerName.toUpperCase();
        title += (playerName.length > 0 ? " · " : "") + competitionsTitle();
        title += " · " + seasonsTitle();
        title += homeOrAwayTitle();
        return title;
    }, [filterState]);

    return (
        <h4 className="title">
            {constructTitle}
            {filterState.selectedClubsPlayedFor.length > 0 && (
                <>
                    <span> · PLAYING FOR:</span>
                    {filterState.selectedClubsPlayedFor.length > 10 ? (
                        <span style={{marginLeft: '5px'}}>{filterState.selectedClubsPlayedFor.length} CLUBS SELECTED</span>
                    ) : (
                        filterState.selectedClubsPlayedFor.map(clubId => (
                            <img
                                className="title-badge"
                                key={clubId}
                                src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(clubId)}.png`}
                                alt={`Club ${clubId}`}
                            />
                        )))}
                </>
            )}
            {filterState.selectedClubsPlayedAgainst.length > 0 && (
                <>
                    <span>· PLAYING AGAINST:</span>
                    {filterState.selectedClubsPlayedAgainst.length > 10 ? (
                        <span style={{marginLeft: '5px'}}>{filterState.selectedClubsPlayedAgainst.length} CLUBS SELECTED</span>
                    ) : (
                        filterState.selectedClubsPlayedAgainst.map(clubId => (
                            <img
                                className="title-badge"
                                key={clubId}
                                src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(clubId)}.png`}
                                alt={`Club ${clubId}`}
                            />
                        )))}
                </>
            )}
        </h4>
    )
}

export default AppearancesChartTitle