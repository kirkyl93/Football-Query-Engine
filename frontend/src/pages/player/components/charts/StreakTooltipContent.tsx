import React from "react";
import {convertDateStringToDate, dateFormatter} from "../../../../lib/DateUtils";
import {Streak} from "../../../../types/Player";
import shared from "../../../../styles/shared.module.css";

interface StreakTooltipContentProps {
    playerStreak: Streak;
    comparisonStreak: Streak;
    comparisonPlayerName: string;
}

const PLAYER_COLOUR = "#86f7aa";
const COMPARISON_COLOUR = "#ffd19c";

const StreakTooltipContent: React.FC<StreakTooltipContentProps> = ({
    playerStreak,
    comparisonStreak,
    comparisonPlayerName,
}) => {
    const playerStartDate = dateFormatter.format(convertDateStringToDate(playerStreak.startDate));
    const playerEndDate = dateFormatter.format(convertDateStringToDate(playerStreak.endDate));
    const comparisonStartDate = dateFormatter.format(convertDateStringToDate(comparisonStreak.startDate));
    const comparisonEndDate = dateFormatter.format(convertDateStringToDate(comparisonStreak.endDate));

    if (comparisonPlayerName.length === 0) {
        return (
            <p style={{fontWeight: 600}}>
                {playerStreak.count}
                {playerStreak.count > 0 && (
                    <span style={{fontWeight: 400, fontSize: 12}}> ({playerStartDate} - {playerEndDate})</span>
                )}
            </p>
        );
    }

    return (
        <>
            <p style={{fontWeight: 600}}>
                <span className={shared['square-title']} style={{backgroundColor: PLAYER_COLOUR}}></span> {playerStreak.count}
                {playerStreak.count > 0 && (
                    <span style={{fontWeight: 400, fontSize: 12}}> ({playerStartDate} - {playerEndDate})</span>
                )}
            </p>
            <p style={{fontWeight: 600}}>
                <span className={shared['square-title']} style={{backgroundColor: COMPARISON_COLOUR}}></span> {comparisonStreak.count}
                {comparisonStreak.count > 0 && (
                    <span style={{fontWeight: 400, fontSize: 12}}> ({comparisonStartDate} - {comparisonEndDate})</span>
                )}
            </p>
        </>
    );
};

export default StreakTooltipContent;
export {PLAYER_COLOUR, COMPARISON_COLOUR};
