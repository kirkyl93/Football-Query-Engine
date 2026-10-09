import React from "react";
import {convertDateStringToDate, dateFormatter} from "../../../../lib/DateUtils";
import {PlayerAppearance, PlayerTotals} from "../../../../types/Player";
import {EventSelection} from "../../lib/appearancesEventMapper";

interface AppearancesSummaryHeaderProps {
    zoomedData: PlayerAppearance[];
    totals: PlayerTotals;
    noEventFiltersSelected: boolean;
    selectedEvents: EventSelection;
}

const AppearancesSummaryHeader: React.FC<AppearancesSummaryHeaderProps> = ({
    zoomedData,
    totals,
    noEventFiltersSelected,
    selectedEvents,
}) => {
    return (
        <>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: '600',
                marginTop: '25px',
                marginLeft: '35px'
            }}>
                {zoomedData.length > 1 ? `Between ${dateFormatter.format(convertDateStringToDate(zoomedData[0].date))} and ${dateFormatter.format(convertDateStringToDate(zoomedData[zoomedData.length - 1].date))}` : null}
            </div>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '4px',
                marginBottom: '4px',
                marginLeft: '35px',
                fontSize: '13.5px',
            }}>
                {zoomedData.length} Games

                {(noEventFiltersSelected || selectedEvents.Goals) ? (
                    <>
                        <span className="square-title" style={{backgroundColor: "blue"}}></span>
                        {totals.goals !== 1 ? `${totals.goals} Goals` : `1 Goal`}
                    </>
                ) : null}

                {(noEventFiltersSelected || selectedEvents.Penalties) ? (
                    <>
                        <span className="square-title" style={{backgroundColor: "gold"}}></span>
                        {totals.penalties !== 1 ? `${totals.penalties} Pens` : `1 Pen`}
                    </>
                ) : null}

                {(noEventFiltersSelected || selectedEvents.Assists) ? (
                    <>
                        <span className="square-title" style={{backgroundColor: "green"}}></span>
                        {totals.assists !== 1 ? `${totals.assists} Assists` : `1 Assist`}
                    </>
                ) : null}
            </div>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '4px',
                marginBottom: '10px',
                marginLeft: '35px',
                fontSize: '13.5px',
            }}>
                {(noEventFiltersSelected || selectedEvents.CleanSheets) ? (
                    <>
                        <img
                            src={'/light-bulb.png'}
                            alt={`Light bulb`}
                            style={{width: '20px', height: '20px', verticalAlign: 'middle', marginTop: '-2px'}}
                        />
                        {totals.cleanSheets !== 1 ? `${totals.cleanSheets} Clean sheets` : `1 Clean sheet`}
                    </>
                ) : null}

                {(noEventFiltersSelected || selectedEvents.OwnGoals) ? (
                    <>
                        <span className="square-title" style={{backgroundColor: "pink"}}></span>
                        {totals.ownGoals !== 1 ? `${totals.ownGoals} Own goals` : `1 Own goal`}
                    </>
                ) : null}

                {(noEventFiltersSelected || selectedEvents.Yellows) ? (
                    <>
                        <span className="square-title" style={{backgroundColor: "yellow"}}></span>
                        {totals.yellows !== 1 ? `${totals.yellows} Yellows` : `1 Yellow`}
                    </>
                ) : null}

                {(noEventFiltersSelected || selectedEvents.Reds) ? (
                    <>
                        <span className="square-title" style={{backgroundColor: "red"}}></span>
                        {totals.reds !== 1 ? `${totals.reds} Reds` : `1 Red`}
                    </>
                ) : null}
            </div>
        </>
    );
};

export default AppearancesSummaryHeader;
