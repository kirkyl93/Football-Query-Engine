import React from "react";
import {convertDateStringToDate, dateFormatter} from "../../../../lib/DateUtils";
import {Streak} from "../../../../types/Player";
import styles from './ComparisonBarChart.module.css';

interface StreakTooltipContentProps {
    playerName: string;
    playerStreak: Streak;
    comparisonStreak: Streak;
    comparisonPlayerName: string;
    colour: string;
}

const PLAYER_COLOUR = "#22c55e";
const COMPARISON_COLOUR = "#f97316";

/** Diagonal-stripe swatch in a row colour, mirroring the comparison bars. */
export const stripedSwatch = (colour: string): React.CSSProperties => ({
    background: `repeating-linear-gradient(45deg, ${colour} 0 2px, #ffffff 2px 5px)`,
});

const StreakTooltipContent: React.FC<StreakTooltipContentProps> = ({
    playerName,
    playerStreak,
    comparisonStreak,
    comparisonPlayerName,
    colour,
}) => {
    const playerStartDate = dateFormatter.format(convertDateStringToDate(playerStreak.startDate));
    const playerEndDate = dateFormatter.format(convertDateStringToDate(playerStreak.endDate));
    const comparisonStartDate = dateFormatter.format(convertDateStringToDate(comparisonStreak.startDate));
    const comparisonEndDate = dateFormatter.format(convertDateStringToDate(comparisonStreak.endDate));

    if (comparisonPlayerName.length === 0) {
        return (
            <p className={styles['tooltip-value']}>
                <span className={styles['legend-solid']} style={{backgroundColor: colour}} /> {playerStreak.count}
                {playerStreak.count > 0 && (
                    <span className={styles['tooltip-dates']}> ({playerStartDate} - {playerEndDate})</span>
                )}
            </p>
        );
    }

    return (
        <>
            <p className={styles['tooltip-value']}>
                <span className={styles['legend-solid']} style={{backgroundColor: colour}} /> {playerName}: {playerStreak.count}
                {playerStreak.count > 0 && (
                    <span className={styles['tooltip-dates']}> ({playerStartDate} - {playerEndDate})</span>
                )}
            </p>
            <p className={styles['tooltip-value']}>
                <span className={styles['legend-striped']} style={stripedSwatch(colour)} /> {comparisonPlayerName}: {comparisonStreak.count}
                {comparisonStreak.count > 0 && (
                    <span className={styles['tooltip-dates']}> ({comparisonStartDate} - {comparisonEndDate})</span>
                )}
            </p>
        </>
    );
};

export default StreakTooltipContent;
export {PLAYER_COLOUR, COMPARISON_COLOUR};
