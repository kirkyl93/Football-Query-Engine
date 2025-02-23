import React from "react";
import {Bar, BarChart, Tooltip, XAxis, YAxis, TooltipProps} from "recharts";
import {PlayerStreaks} from "../../../types/Player";
import {convertDateStringToDate, dateFormatter} from "../../../lib/DateUtils";
import './TeamStreakChart.css'


interface PlayerStreakChartProps {
    playerName: string;
    playerStreaks: PlayerStreaks;
    comparisonPlayerName: string;
    comparisonPlayerStreaks: PlayerStreaks;
}

const PlayerStreakChart: React.FC<PlayerStreakChartProps> = (
    {
        playerName, playerStreaks, comparisonPlayerName, comparisonPlayerStreaks
    }) => {

    const streakTypes = [
        { name: "scored", key: "longestGoalStreak" },
        { name: "scored (excl. penalties)", key: "longestGoalStreakExcludingPenalties" },
        { name: "didn't score", key: "longestGoalDrought" },
        { name: "assisted", key: "longestAssistStreak" },
        { name: "booked", key: "longestYellowStreak" },
        { name: "sent off", key: "longestRedStreak" },
    ];

    const playerConsecutiveGameData = [
        {
            name: "scored",
            player1: playerStreaks.longestGoalStreak.count,
            player2: comparisonPlayerStreaks.longestGoalStreak.count
        },
        {
            name: "scored (excl. penalties)",
            player1: playerStreaks.longestGoalStreakExcludingPenalties.count,
            player2: comparisonPlayerStreaks.longestGoalStreakExcludingPenalties.count
        },
        {
            name: "didn't score",
            player1: playerStreaks.longestGoalDrought.count,
            player2: comparisonPlayerStreaks.longestGoalDrought.count
        },
        {
            name: "assisted",
            player1: playerStreaks.longestAssistStreak.count,
            player2: comparisonPlayerStreaks.longestAssistStreak.count,
        },
        {
            name: "booked",
            player1: playerStreaks.longestYellowStreak.count,
            player2: comparisonPlayerStreaks.longestYellowStreak.count,
        },
        {
            name: "sent off",
            player1: playerStreaks.longestRedStreak.count,
            player2: comparisonPlayerStreaks.longestRedStreak.count,
        }
    ]

    const getCustomTooltipContent = (label: string) => {
        const streak = streakTypes.find(streak => streak.name === label);

        if (!streak) return null;

        const playerStreak = playerStreaks[streak.key as keyof PlayerStreaks];
        const comparisonStreak = comparisonPlayerStreaks[streak.key as keyof PlayerStreaks];

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
        } else {
            return (
                <>
                    <p style={{fontWeight: 600}}>
                        <span className="square-title" style={{backgroundColor: "#86f7aa"}}></span> {playerStreak.count}
                        {playerStreak.count > 0 && (
                            <span style={{fontWeight: 400, fontSize: 12}}> ({playerStartDate} - {playerEndDate})</span>
                        )}
                    </p>
                    <p style={{fontWeight: 600}}>
                        <span className="square-title" style={{backgroundColor: "#ffd19c"}}></span> {comparisonStreak.count}
                        {comparisonStreak.count > 0 && (
                            <span style={{fontWeight: 400, fontSize: 12}}> ({comparisonStartDate} - {comparisonEndDate})</span>
                        )}
                    </p>
                </>
            );
        }
    }

    const CustomTooltip: React.FC<TooltipProps<number, string>> = ({active, payload, label}) => {
        if (active && payload && payload.length) {

            return (
                <div className="team-streak-custom-tooltip">
                    {getCustomTooltipContent(label)}
                </div>
            );
        }

        return null;
    };

    return (
        <div style={{width: 500}}>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: '600',
                marginTop: '5px'
            }}>
                Most consecutive games where player
            </div>
            {comparisonPlayerName.length > 0 && (<div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: '4px',
                    marginBottom: '4px',
                    fontSize: '13.5px',
                }}>
                    <span className="square-title" style={{backgroundColor: "#86f7aa"}}></span> {playerName}
                    <span className="square-title" style={{backgroundColor: "#ffd19c"}}></span> {comparisonPlayerName}
                </div>
            )}

            <BarChart
                data={playerConsecutiveGameData}
                width={400}
                height={520}
                layout="vertical"
                margin={{top: 20, left: 50, right: 20, bottom: 50}}>
                <XAxis
                    type="number"
                    tick={{fontSize: 13}}
                />

                <YAxis
                    dataKey="name"
                    type="category"
                    tick={{fontSize: 13}}
                />
                <Tooltip content={<CustomTooltip/>}/>
                <Bar
                    dataKey="player1"
                    barSize={12}
                    stroke={"black"}
                    strokeWidth={1.2}
                    fill="#86f7aa"
                />
                {comparisonPlayerName.length > 0 &&
                    <Bar
                        dataKey="player2"
                        barSize={12}
                        stroke={"black"}
                        strokeWidth={1.2}
                        fill="#ffd19c"
                    />
                }
            </BarChart>
        </div>
    )
}

export default PlayerStreakChart;