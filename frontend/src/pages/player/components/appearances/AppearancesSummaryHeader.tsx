import React from "react";
import {convertDateStringToDate, dateFormatter} from "../../../../lib/DateUtils";
import {PlayerAppearance, PlayerTotals} from "../../../../types/Player";
import {EventSelection} from "../../lib/appearancesEventMapper";
import shared from "../../../../styles/shared.module.css";
import styles from "./AppearancesSummaryHeader.module.css";

interface AppearancesSummaryHeaderProps {
    zoomedData: PlayerAppearance[];
    totals: PlayerTotals;
    noEventFiltersSelected: boolean;
    selectedEvents: EventSelection;
}

/**
 * Keeps each swatch + label pair on one line: on narrow screens the legend
 * rows wrap at pair boundaries instead of splitting "17 Clean" / "sheets".
 */
const legendItemStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
};

const AppearancesSummaryHeader: React.FC<AppearancesSummaryHeaderProps> = ({
    zoomedData,
    totals,
    noEventFiltersSelected,
    selectedEvents,
}) => {
    return (
        <>
            <div className={styles['dateLine']}>
                {zoomedData.length > 1 ? `Between ${dateFormatter.format(convertDateStringToDate(zoomedData[0].date))} and ${dateFormatter.format(convertDateStringToDate(zoomedData[zoomedData.length - 1].date))}` : null}
            </div>
            <div className={styles['legendRow']}>
                <span style={legendItemStyle}>{zoomedData.length} Games</span>

                {(noEventFiltersSelected || selectedEvents.Goals) ? (
                    <span style={legendItemStyle}>
                        <span className={shared['square-title']} style={{backgroundColor: "blue"}}></span>
                        {totals.goals !== 1 ? `${totals.goals} Goals` : `1 Goal`}
                    </span>
                ) : null}

                {(noEventFiltersSelected || selectedEvents.Penalties) ? (
                    <span style={legendItemStyle}>
                        <span className={shared['square-title']} style={{backgroundColor: "gold"}}></span>
                        {totals.penalties !== 1 ? `${totals.penalties} Pens` : `1 Pen`}
                    </span>
                ) : null}

                {(noEventFiltersSelected || selectedEvents.Assists) ? (
                    <span style={legendItemStyle}>
                        <span className={shared['square-title']} style={{backgroundColor: "green"}}></span>
                        {totals.assists !== 1 ? `${totals.assists} Assists` : `1 Assist`}
                    </span>
                ) : null}
            </div>
            <div className={`${styles['legendRow']} ${styles['legendRowLast']}`}>
                {(noEventFiltersSelected || selectedEvents.CleanSheets) ? (
                    <span style={legendItemStyle}>
                        <img
                            src={'/light-bulb.png'}
                            alt={`Light bulb`}
                            style={{width: '20px', height: '20px', verticalAlign: 'middle', marginTop: '-2px'}}
                        />
                        {totals.cleanSheets !== 1 ? `${totals.cleanSheets} Clean sheets` : `1 Clean sheet`}
                    </span>
                ) : null}

                {(noEventFiltersSelected || selectedEvents.OwnGoals) ? (
                    <span style={legendItemStyle}>
                        <span className={shared['square-title']} style={{backgroundColor: "pink"}}></span>
                        {totals.ownGoals !== 1 ? `${totals.ownGoals} Own goals` : `1 Own goal`}
                    </span>
                ) : null}

                {(noEventFiltersSelected || selectedEvents.Yellows) ? (
                    <span style={legendItemStyle}>
                        <span className={shared['square-title']} style={{backgroundColor: "yellow"}}></span>
                        {totals.yellows !== 1 ? `${totals.yellows} Yellows` : `1 Yellow`}
                    </span>
                ) : null}

                {(noEventFiltersSelected || selectedEvents.Reds) ? (
                    <span style={legendItemStyle}>
                        <span className={shared['square-title']} style={{backgroundColor: "red"}}></span>
                        {totals.reds !== 1 ? `${totals.reds} Reds` : `1 Red`}
                    </span>
                ) : null}
            </div>
        </>
    );
};

export default AppearancesSummaryHeader;
