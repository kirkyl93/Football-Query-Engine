import React from "react";
import {convertDateStringToDate, dateFormatter} from "../../../../lib/DateUtils";
import {Streak} from "../../../../types/Player";
import shared from "../../../../styles/shared.module.css";
import styles from './ComparisonBarChart.module.css';

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
            <p className={styles['tooltip-value']}>
                {playerStreak.count}
                {playerStreak.count > 0 && (
                    <span className={styles['tooltip-dates']}> ({playerStartDate} - {playerEndDate})</span>
                )}
            </p>
        );
    }

    return (
        <>
            <p className={styles['tooltip-value']}>
                <span className={shared['square-title']} style={{backgroundColor: PLAYER_COLOUR}}></span> {playerStreak.count}
                {playerStreak.count > 0 && (
                    <span className={styles['tooltip-dates']}> ({playerStartDate} - {playerEndDate})</span>
                )}
            </p>
            <p className={styles['tooltip-value']}>
                <span className={shared['square-title']} style={{backgroundColor: COMPARISON_COLOUR}}></span> {comparisonStreak.count}
                {comparisonStreak.count > 0 && (
                    <span className={styles['tooltip-dates']}> ({comparisonStartDate} - {comparisonEndDate})</span>
                )}
            </p>
        </>
    );
};

export default StreakTooltipContent;
export {PLAYER_COLOUR, COMPARISON_COLOUR};
