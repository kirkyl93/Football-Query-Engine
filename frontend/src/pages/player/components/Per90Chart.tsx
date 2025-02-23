import React from "react";
import {Bar, BarChart, Tooltip, XAxis, YAxis, TooltipProps} from "recharts";
import {PlayerStats} from "../../../types/Player";
import './TeamStreakChart.css'


interface Per90Props {
    playerName: string;
    playerStats: PlayerStats;
    comparisonPlayerName: string;
    comparisonPlayerStats: PlayerStats;
}

const Per90Chart: React.FC<Per90Props> = (
    {
        playerName, playerStats, comparisonPlayerName, comparisonPlayerStats
    }) => {

    const minutesPer90Data = [
        {
            name: "goals",
            player1: (90 / (playerStats.totalMinutes / (playerStats.totalPlayerGoalsExcludingPenalties + playerStats.totalPenalties))).toFixed(2),
            player2: (90 / (comparisonPlayerStats.totalMinutes / (comparisonPlayerStats.totalPlayerGoalsExcludingPenalties + comparisonPlayerStats.totalPenalties))).toFixed(2),
        },
        {
            name: "goals (excl. penalties)",
            player1: (90 / (playerStats.totalMinutes / playerStats.totalPlayerGoalsExcludingPenalties)).toFixed(2),
            player2: (90 / (comparisonPlayerStats.totalMinutes / comparisonPlayerStats.totalPlayerGoalsExcludingPenalties)).toFixed(2),
        },
        {
            name: "assists",
            player1: (90 / (playerStats.totalMinutes / (playerStats.totalPlayerAssists))).toFixed(2),
            player2: (90 / (comparisonPlayerStats.totalMinutes / (comparisonPlayerStats.totalPlayerAssists))).toFixed(2),
        },
        {
            name: "yellows",
            player1: (90 / (playerStats.totalMinutes / (playerStats.totalYellows))).toFixed(2),
            player2: (90 / (comparisonPlayerStats.totalMinutes / (comparisonPlayerStats.totalYellows))).toFixed(2),
        },
        {
            name: "reds",
            player1: (90 / (playerStats.totalMinutes / (playerStats.totalReds))).toFixed(2),
            player2: (90 / (comparisonPlayerStats.totalMinutes / (comparisonPlayerStats.totalReds))).toFixed(2),
        },
        {
            name: "team goals",
            player1: (playerStats.totalTeamGoals / playerStats.totalGames).toFixed(2),
            player2: (comparisonPlayerStats.totalTeamGoals / comparisonPlayerStats.totalGames).toFixed(2),
        },
        {
            name: "team conceded",
            player1: (playerStats.totalTeamGoalsConceded / playerStats.totalGames).toFixed(2),
            player2: (comparisonPlayerStats.totalTeamGoalsConceded / comparisonPlayerStats.totalGames).toFixed(2),
        },
    ]

    const getCustomTooltipContent = (player1Value: number | undefined, player2Value: number | undefined) => {
        if (comparisonPlayerName.length === 0) {
            return (
                <p style={{fontWeight: 600}}>
                    {player1Value}
                </p>
            );
        } else {
            return (
                <>
                    <p style={{fontWeight: 600}}>
                        <span className="square-title" style={{backgroundColor: "#86f7aa"}}></span> {player1Value}
                    </p>
                    <p style={{fontWeight: 600}}>
                        <span className="square-title" style={{backgroundColor: "#ffd19c"}}></span> {player2Value}

                    </p>
                </>
            );
        }
    }

    const CustomTooltip: React.FC<TooltipProps<number, string>> = ({active, payload, label}) => {
        if (active && payload && payload.length) {

            return (
                <div className="team-streak-custom-tooltip">
                    {getCustomTooltipContent(payload[0].payload.player1, payload.length > 1 ? payload[0].payload.player2 : 0)}
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
                Per 90
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
                data={minutesPer90Data}
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

export default Per90Chart;