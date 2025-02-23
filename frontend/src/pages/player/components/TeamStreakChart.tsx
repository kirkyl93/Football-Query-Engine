import React from "react";
import {Bar, BarChart, Tooltip, XAxis, YAxis, TooltipProps} from "recharts";
import {PlayerStreaks} from "../../../types/Player";
import {convertDateStringToDate, dateFormatter} from "../../../lib/DateUtils";
import './TeamStreakChart.css'


interface TeamStreakChartProps {
    playerName: string;
    playerStreaks: PlayerStreaks;
    comparisonPlayerName: string;
    comparisonPlayerStreaks: PlayerStreaks;
}

const TeamStreakChart: React.FC<TeamStreakChartProps> = (
    {
        playerName, playerStreaks, comparisonPlayerName, comparisonPlayerStreaks
    }) => {

    const streakTypes = [
        {name: "won", key: "longestWinningStreak"},
        {name: "didn't lose", key: "longestUnbeatenStreak"},
        {name: "lost", key: "longestLosingStreak"},
        {name: "scored", key: "longestTeamScoringStreak"},
        {name: "didn't score", key: "longestTeamNotScoringStreak"},
        {name: "kept a clean sheet", key: "longestCleanSheetStreak"},
        {name: "didn't keep a clean sheet", key: "longestStreakWithoutCleanSheet"}
    ];

    const teamConsecutiveGameData = [
        {
            name: "won",
            player1: playerStreaks.longestWinningStreak.count,
            player2: comparisonPlayerStreaks.longestWinningStreak.count,
        },
        {
            name: "didn't lose",
            player1: playerStreaks.longestUnbeatenStreak.count,
            player2: comparisonPlayerStreaks.longestUnbeatenStreak.count,
        },
        {
            name: "lost",
            player1: playerStreaks.longestLosingStreak.count,
            player2: comparisonPlayerStreaks.longestLosingStreak.count,
        },
        {
            name: "scored",
            player1: playerStreaks.longestTeamScoringStreak.count,
            player2: comparisonPlayerStreaks.longestTeamScoringStreak.count,
        },
        {
            name: "didn't score",
            player1: playerStreaks.longestTeamNotScoringStreak.count,
            player2: comparisonPlayerStreaks.longestTeamNotScoringStreak.count,
        },
        {
            name: "kept a clean sheet",
            player1: playerStreaks.longestCleanSheetStreak.count,
            player2: comparisonPlayerStreaks.longestCleanSheetStreak.count,
        },
        {
            name: "didn't keep a clean sheet",
            player1: playerStreaks.longestStreakWithoutCleanSheet.count,
            player2: comparisonPlayerStreaks.longestStreakWithoutCleanSheet.count,
        }
    ];

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
                Most consecutive games where team
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
                data={teamConsecutiveGameData}
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

export default TeamStreakChart;