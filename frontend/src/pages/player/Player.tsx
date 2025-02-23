import React, {useEffect, useMemo, useState} from "react";
import './Player.css';

import {useParams} from "react-router-dom";
import {convertDateStringToDate, dateFormatter} from "../../lib/DateUtils";
import {LoadingBar} from "../../components/LoadingBar";
import {AppearancesChart} from "./components/AppearancesChart";
import {
    createDefaultPlayerStats,
    createDefaultPlayerStreaks,
    Player,
    PlayerAppearance, PlayerStats,
    PlayerStreaks,
    Result
} from "../../types/Player";
import {Bar, BarChart, Tooltip, XAxis, YAxis, PieChart, Pie, Sector, Cell} from "recharts";
import PlayerSearchBar from "../../components/PlayerSearchBar";
import TeamStreakChart from "./components/TeamStreakChart";
import PlayerStreakChart from "./components/PlayerStreakChart";
import Per90Chart from "./components/Per90Chart";
import PlayerWinPercentageChart from "../../components/PlayerWinPercentageChart";

const Player: React.FC = () => {
    const {playerId} = useParams<{ playerId: string }>();
    const [playerData, setPlayerData] = useState<Player | null>(null);
    const [zoomedPlayerGameData, setZoomedPlayerGameData] = useState<PlayerAppearance[]>([]);
    const [playerGameData, setPlayerGameData] = useState<PlayerAppearance[]>([]);
    const [playerStreaks, setPlayerStreaks] = useState<PlayerStreaks>(createDefaultPlayerStreaks);
    const [comparisonPlayerName, setComparisonPlayerName] = useState<string>("");
    const [comparisonPlayerGameData, setComparisonPlayerGameData] = useState<PlayerAppearance[]>([]);
    const [zoomedComparisonPlayerGameData, setZoomedComparisonPlayerGameData] = useState<PlayerAppearance[]>([]);
    const [comparisonPlayerStreaks, setComparisonPlayerStreaks] = useState<PlayerStreaks>(createDefaultPlayerStreaks);
    const [stats, setStats] = useState<PlayerStats>(createDefaultPlayerStats);
    const [comparisonStats, setComparisonStats] = useState<PlayerStats>(createDefaultPlayerStats);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState<number>(0);


    const handleSelectPlayer = (playerName: string, playerGameData: PlayerAppearance[]) => {
        setComparisonPlayerName(playerName);
        setComparisonPlayerGameData(playerGameData);
    };

    const onPieEnter = (_, index: number) => {
        setActiveIndex(index);
    };

    useEffect(() => {
        const fetchPlayerData = async () => {
            setLoading(true);
            setComparisonPlayerGameData([]);
            setComparisonPlayerName("");
            try {
                const [playerResponse, playerGameDataResponse] = await Promise.all([
                    fetch(`http://localhost:8080/players/${playerId}`),
                    fetch(`http://localhost:8080/players/${playerId}/games`)
                ]);

                if (!playerResponse.ok || !playerGameDataResponse.ok) {
                    throw new Error('Network response was not ok');
                }

                const playerData: Player[] = await playerResponse.json();
                const playerGameData: PlayerAppearance[] = await playerGameDataResponse.json();

                setPlayerData(playerData[0]);
                setPlayerGameData(playerGameData);
            } catch (error) {
                setError('Failed to fetch player data');
            } finally {
                setLoading(false);
            }
        };
        fetchPlayerData();
    }, [playerId]);


    const playerAndTeamStats = (appearances: PlayerAppearance[]) => {
        if (!appearances) {
            return createDefaultPlayerStats();
        }

        const processMinute = (minute: number, minuteArray: number[]) => {
            if (minute < 1) {
                return;
            }

            let index = Math.floor((minute - 1) / 15);

            if (index > minuteArray.length - 1) {
                index = minuteArray.length - 1;
            }

            minuteArray[index]++;
        }

        const incrementBucket = (value: number, buckets: number[]) => {
            let index = value >= buckets.length - 1 ? buckets.length - 1 : value;
            buckets[index]++;
        };

        const processMinutesPlayedBucket = (start: number, end: number, minutesPlayed: number[]) => {
            const intervals = [15, 30, 45, 60, 75, 90, 120];

            for (let i = 0; i < intervals.length; i++) {
                if (start < intervals[i]) {
                    minutesPlayed[i] += Math.min(intervals[i], end) - Math.max(start, i === 0 ? 0 : intervals[i - 1]);
                }

                if (end <= intervals[i]) {
                    return;
                }
            }
        };

        let playerStats = createDefaultPlayerStats();
        playerStats.totalGames = appearances.length;

        appearances.forEach((appearance) => {
            let startedGame = appearance.minutes_played[0] === 0;
            let finishedGame = appearance.subbed_off_minute === 0;

            if (startedGame && finishedGame) {
                playerStats.gamesStartedAndFinished++;
            } else if (startedGame) {
                playerStats.gamesStartedAndSubbedOff++;
            } else if (finishedGame) {
                playerStats.gamesSubbedOnAndFinished++;
            } else {
                playerStats.gamesSubbedOnAndSubbedOff++;
            }

            playerStats.totalMinutes += appearance.minutes_played[1] - appearance.minutes_played[0];
            processMinutesPlayedBucket(appearance.minutes_played[0], appearance.minutes_played[1], playerStats.playerAppearancesByMinute);
            let teamGoals = appearance.club_id === appearance.home_club_id ? appearance.home_club_goals : appearance.away_club_goals;
            let teamGoalsConceded = appearance.club_id === appearance.home_club_id ? appearance.away_club_goals : appearance.home_club_goals;
            if (teamGoals > teamGoalsConceded) {
                playerStats.totalWins++;
            } else if (teamGoals === teamGoalsConceded) {
                playerStats.totalDraws++;
            } else {
                playerStats.totalLosses++;
            }
            playerStats.totalTeamGoals += teamGoals;
            playerStats.totalTeamGoalsConceded += teamGoalsConceded;
            playerStats.totalPlayerGoalsExcludingPenalties += appearance.goals - appearance.penalty_goals;
            playerStats.totalPenalties += appearance.penalty_goals;
            playerStats.totalPlayerAssists += appearance.assist_minutes.length;
            playerStats.totalYellows += appearance.yellow_minutes.length;
            playerStats.totalReds += appearance.red_minutes.length;
            if (appearance.yellow_minutes.length == 2) {
                playerStats.totalReds++;
            }

            incrementBucket(appearance.goals, playerStats.playerGoalsByGame);

            appearance.goal_minutes.forEach(goalMinute => {
                processMinute(goalMinute, playerStats.playerGoalsByMinute);
            })

            appearance.penalty_goal_minutes.forEach(penaltyMinute => {
                processMinute(penaltyMinute, playerStats.playerGoalsByMinute);
            })

            incrementBucket(appearance.assists, playerStats.playerAssistsByGame);

            appearance.assist_minutes.forEach(assistMinute => {
                processMinute(assistMinute, playerStats.playerAssistsByMinute);
            })

            incrementBucket(teamGoals, playerStats.teamGoalsByGame);

            incrementBucket(teamGoalsConceded, playerStats.teamGoalsConcededByGame);

        });

        return playerStats;
    };

    const streakCalculation = (appearances: PlayerAppearance[]) => {

        type StreakWithTempDate = {
            current: number;
            longest: number;
            tempStartDate: string;
            startDate: string;
            endDate: string;
        };

        const createStreak = (): StreakWithTempDate => ({
            longest: 0,
            current: 0,
            startDate: "",
            endDate: "",
            tempStartDate: ""
        });

        const streaks = {
            goal: createStreak(),
            goalExcludingPenalties: createStreak(),
            noGoal: createStreak(),
            assist: createStreak(),
            cleanSheet: createStreak(),
            withoutCleanSheet: createStreak(),
            teamScoring: createStreak(),
            teamNotScoring: createStreak(),
            winning: createStreak(),
            losing: createStreak(),
            unbeaten: createStreak(),
            yellow: createStreak(),
            red: createStreak()
        };

        const updateStreak = (streak: StreakWithTempDate, condition: boolean, date: string) => {
            if (condition) {
                if (streak.current === 0) streak.tempStartDate = date;
                streak.current++;
                if (streak.current > streak.longest) {
                    streak.longest = streak.current;
                    streak.startDate = streak.tempStartDate;
                    streak.endDate = date;
                }
            } else {
                streak.current = 0;
                streak.tempStartDate = "";
            }
        };

        appearances.forEach((appearance) => {
            const atHome = appearance.club_id === appearance.home_club_id;

            const result = appearance.home_club_goals === appearance.away_club_goals
                ? Result.DRAW
                : (atHome === (appearance.home_club_goals > appearance.away_club_goals) ? Result.WIN : Result.LOSS);

            const conditions = {
                goal: appearance.goals > 0,
                goalExcludingPenalties: appearance.goal_minutes.length > 0,
                noGoal: appearance.goals === 0,
                assist: appearance.assists > 0,
                yellow: appearance.yellow_minutes.length > 0,
                red: appearance.yellow_minutes.length > 1 || appearance.red_cards > 0,
                teamScoring: atHome ? appearance.home_club_goals > 0 : appearance.away_club_goals > 0,
                teamNotScoring: atHome ? appearance.home_club_goals === 0 : appearance.away_club_goals === 0,
                cleanSheet: atHome ? appearance.away_club_goals === 0 : appearance.home_club_goals === 0,
                withoutCleanSheet: atHome ? appearance.away_club_goals > 0 : appearance.home_club_goals > 0,
                winning: result === Result.WIN,
                losing: result === Result.LOSS,
                unbeaten: result !== Result.LOSS
            };

            Object.entries(conditions).forEach(([key, condition]) => {
                updateStreak(streaks[key as keyof typeof streaks], condition, appearance.date);
            });
        });

        const mapStreaks = (streaks: Record<string, StreakWithTempDate>) => {
            const keys = {
                longestWinningStreak: "winning",
                longestUnbeatenStreak: "unbeaten",
                longestLosingStreak: "losing",
                longestTeamScoringStreak: "teamScoring",
                longestTeamNotScoringStreak: "teamNotScoring",
                longestCleanSheetStreak: "cleanSheet",
                longestStreakWithoutCleanSheet: "withoutCleanSheet",
                longestGoalStreak: "goal",
                longestGoalStreakExcludingPenalties: "goalExcludingPenalties",
                longestGoalDrought: "noGoal",
                longestAssistStreak: "assist",
                longestYellowStreak: "yellow",
                longestRedStreak: "red"
            } as const;

            return Object.fromEntries(
                Object.entries(keys).map(([key, value]) => [
                    key,
                    {
                        count: streaks[value].longest,
                        startDate: streaks[value].startDate,
                        endDate: streaks[value].endDate
                    }
                ])
            ) as PlayerStreaks;
        };

        return mapStreaks(streaks);
    };

    const player1WinDrawLoss = [
        {name: "Win", value: stats.totalWins, colour: "green"},
        {name: "Draw", value: stats.totalDraws, colour: "yellow"},
        {name: "Loss", value: stats.totalLosses, colour: "red"},
    ];

    const player1Goals = [
        {name: "No goals", value: stats.playerGoalsByGame[0], colour: "red"},
        {name: "1 goal", value: stats.playerGoalsByGame[1], colour: "yellow"},
        {name: "2 goals", value: stats.playerGoalsByGame[2], colour: "green"},
        {name: "3+ goals", value: stats.playerGoalsByGame[3], colour: "gold"},
    ];

    const player1PercentageOfTeamGoalsContributedTo = [
        {name: "Scored from open play", value: stats.totalPlayerGoalsExcludingPenalties, colour: "blue"},
        {name: "Penalties", value: stats.totalPenalties, colour: "gold"},
        {name: "Assists", value: stats.totalPlayerAssists, colour: "green"},
        {
            name: "Not involved",
            value: stats.totalTeamGoals - stats.totalPlayerGoalsExcludingPenalties - stats.totalPenalties - stats.totalPlayerAssists,
            colour: "red"
        }
    ]

    const player1TeamGoalsScored = [
        {name: "No goals", value: stats.teamGoalsByGame[0], colour: "red"},
        {name: "1 goal", value: stats.teamGoalsByGame[1], colour: "yellow"},
        {name: "2 goals", value: stats.teamGoalsByGame[2], colour: "green"},
        {name: "3 goals", value: stats.teamGoalsByGame[3], colour: "blue"},
        {name: "4 goals", value: stats.teamGoalsByGame[4], colour: "silver"},
        {name: "5+ goals", value: stats.teamGoalsByGame[5], colour: "gold"}
    ]

    const player1TeamGoalsConceded = [
        {name: "No goals", value: stats.teamGoalsConcededByGame[0], colour: "green"},
        {name: "1 goal", value: stats.teamGoalsConcededByGame[1], colour: "yellow"},
        {name: "2 goals", value: stats.teamGoalsConcededByGame[2], colour: "grey"},
        {name: "3 goals", value: stats.teamGoalsConcededByGame[3], colour: "#FFBF00"},
        {name: "4 goals", value: stats.teamGoalsConcededByGame[4], colour: "red"},
        {name: "5+ goals", value: stats.teamGoalsConcededByGame[5], colour: "black"}
    ]

    const minutesPlayed = [
        {name: "Full game", value: stats.gamesStartedAndFinished, colour: "green"},
        {name: "Started and subbed", value: stats.gamesStartedAndSubbedOff, colour: "yellow"},
        {name: "Subbed on and finished", value: stats.gamesSubbedOnAndFinished, colour: "#FFBF00"},
        {name: "Subbed on and off", value: stats.gamesSubbedOnAndSubbedOff, colour: "red"}
    ]

    const playerGoalsByMinute = [
        {
            name: "First 15mins",
            minutesPlayed: stats.playerAppearancesByMinute[0] > 0 ? ((stats.playerAppearancesByMinute[0] / stats.totalMinutes) * 100).toFixed(2) : 0,
            assists: stats.playerAssistsByMinute[0] > 0 ? ((stats.playerAssistsByMinute[0] / stats.totalPlayerAssists) * 100).toFixed(2) : 0,
            goals: stats.playerGoalsByMinute[0] > 0 ? ((stats.playerGoalsByMinute[0] / (stats.totalPlayerGoalsExcludingPenalties + stats.totalPenalties)) * 100).toFixed(2) : 0
        },
        {
            name: "16-30mins",
            minutesPlayed: stats.playerAppearancesByMinute[1] > 0 ? ((stats.playerAppearancesByMinute[1] / stats.totalMinutes) * 100).toFixed(2) : 0,
            assists: stats.playerAssistsByMinute[1] > 0 ? ((stats.playerAssistsByMinute[1] / stats.totalPlayerAssists) * 100).toFixed(2) : 0,
            goals: stats.playerGoalsByMinute[1] > 0 ? ((stats.playerGoalsByMinute[1] / (stats.totalPlayerGoalsExcludingPenalties + stats.totalPenalties)) * 100).toFixed(2) : 0
        },
        {
            name: "31-45mins",
            minutesPlayed: stats.playerAppearancesByMinute[2] > 0 ? ((stats.playerAppearancesByMinute[2] / stats.totalMinutes) * 100).toFixed(2) : 0,
            assists: stats.playerAssistsByMinute[2] > 0 ? ((stats.playerAssistsByMinute[2] / stats.totalPlayerAssists) * 100).toFixed(2) : 0,
            goals: stats.playerGoalsByMinute[2] > 0 ? ((stats.playerGoalsByMinute[2] / (stats.totalPlayerGoalsExcludingPenalties + stats.totalPenalties)) * 100).toFixed(2) : 0
        },
        {
            name: "46-60mins",
            minutesPlayed: stats.playerAppearancesByMinute[3] > 0 ? ((stats.playerAppearancesByMinute[3] / stats.totalMinutes) * 100).toFixed(2) : 0,
            assists: stats.playerAssistsByMinute[3] > 0 ? ((stats.playerAssistsByMinute[3] / stats.totalPlayerAssists) * 100).toFixed(2) : 0,
            goals: stats.playerGoalsByMinute[3] > 0 ? ((stats.playerGoalsByMinute[3] / (stats.totalPlayerGoalsExcludingPenalties + stats.totalPenalties)) * 100).toFixed(2) : 0
        },
        {
            name: "61-75mins",
            minutesPlayed: stats.playerAppearancesByMinute[4] > 0 ? ((stats.playerAppearancesByMinute[4] / stats.totalMinutes) * 100).toFixed(2) : 0,
            assists: stats.playerAssistsByMinute[4] > 0 ? ((stats.playerAssistsByMinute[4] / stats.totalPlayerAssists) * 100).toFixed(2) : 0,
            goals: stats.playerGoalsByMinute[4] > 0 ? ((stats.playerGoalsByMinute[4] / (stats.totalPlayerGoalsExcludingPenalties + stats.totalPenalties)) * 100).toFixed(2) : 0
        },
        {
            name: "76-90mins",
            minutesPlayed: stats.playerAppearancesByMinute[5] > 0 ? ((stats.playerAppearancesByMinute[5] / stats.totalMinutes) * 100).toFixed(2) : 0,
            assists: stats.playerAssistsByMinute[5] > 0 ? ((stats.playerAssistsByMinute[5] / stats.totalPlayerAssists) * 100).toFixed(2) : 0,
            goals: stats.playerGoalsByMinute[5] > 0 ? ((stats.playerGoalsByMinute[5] / (stats.totalPlayerGoalsExcludingPenalties + stats.totalPenalties)) * 100).toFixed(2) : 0
        }
    ]

    useEffect(() => {
        setPlayerStreaks(streakCalculation(zoomedPlayerGameData));
        setStats(playerAndTeamStats(zoomedPlayerGameData));
    }, [zoomedPlayerGameData]);

    useEffect(() => {
        setComparisonPlayerStreaks(streakCalculation(zoomedComparisonPlayerGameData));
        setComparisonStats(playerAndTeamStats(zoomedComparisonPlayerGameData));
    }, [zoomedComparisonPlayerGameData]);


    const renderActiveShape = (props) => {
        const RADIAN = Math.PI / 180;
        const {cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value} = props;
        const sin = Math.sin(-RADIAN * midAngle);
        const cos = Math.cos(-RADIAN * midAngle);
        const sx = cx + (outerRadius + 10) * cos;
        const sy = cy + (outerRadius + 10) * sin;
        const mx = cx + (outerRadius + 30) * cos;
        const my = cy + (outerRadius + 30) * sin;
        const ex = mx + (cos >= 0 ? 1 : -1) * 22;
        const ey = my;
        const textAnchor = cos >= 0 ? 'start' : 'end';

        return (
            <g>
                <text x={cx} y={cy} dy={8} textAnchor="middle" fill={"black"}>
                    {payload.name}
                </text>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    stroke="black"
                    strokeWidth={2.5}
                    fill={fill}
                />
                <Sector
                    cx={cx}
                    cy={cy}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    innerRadius={outerRadius + 6}
                    outerRadius={outerRadius + 10}
                    stroke="black"
                    strokeWidth={1}
                    fill={fill}
                />
                <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none"/>
                <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none"/>
                <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${value}`}</text>
                <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
                    {`(Rate ${(percent * 100).toFixed(2)}%)`}
                </text>
            </g>
        );
    };

    if (loading || !playerData) {
        return <LoadingBar
            loading={loading}
            hasData={false}
            hasMore={true}
            error={error}
        />
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div className="player-page-container">
            <div className={"player-info"}>
                <div style={{fontWeight: "800", fontSize: "14"}}>
                    <img
                        src={playerData?.image_url}
                        alt={playerData?.first_name + " " + playerData?.last_name}
                        width="95"
                        style={{borderRadius: '25%', marginRight: "10px"}}
                    />
                </div>
                <div style={{marginRight: "100px"}}>
                    <h3>{playerData?.first_name + " " + playerData?.last_name}</h3>
                    <p>
                        Nation:
                        <img
                            className="second-gs-columns-to-hide"
                            src={`https://flagicons.lipis.dev/flags/4x3/${playerData?.country_code}.svg`}
                            alt={`${playerData?.country_code}`}
                            style={{width: '17px', height: '13px', marginRight: '5px', marginLeft: '5px'}}
                        />
                        {playerData?.country_of_citizenship}
                    </p>
                    <p>
                        Date of birth: {dateFormatter.format(convertDateStringToDate(playerData?.date_of_birth || ""))}<span
                        style={{fontWeight: 600}}> ({playerData?.age})</span>
                    </p>
                    <p>Position: {playerData?.sub_position}</p>
                    <p>Height: {playerData?.height_in_cm}cm</p>
                </div>
                <PlayerSearchBar placeHolderText={"Compare with..."} linkToPlayer={false}
                                 onSelectPlayer={handleSelectPlayer}/>
            </div>
            <div className="graph">
                <AppearancesChart
                    playerName={""} data={playerGameData} onZoomChange={setZoomedPlayerGameData}/>
                {comparisonPlayerGameData.length > 0 &&
                    <AppearancesChart
                        playerName={comparisonPlayerName} data={comparisonPlayerGameData}
                        onZoomChange={setZoomedComparisonPlayerGameData}/>
                }
            </div>
            <div style={{display: "flex", width: "85%", flexWrap: "wrap", justifyContent: "space-between" }}>
                <TeamStreakChart
                    playerName={playerData.last_name}
                    playerStreaks={playerStreaks}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonPlayerStreaks={comparisonPlayerStreaks}
                />
                <PlayerStreakChart
                    playerName={playerData.last_name}
                    playerStreaks={playerStreaks}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonPlayerStreaks={comparisonPlayerStreaks}
                />
                <Per90Chart
                    playerName={playerData.last_name}
                    playerStats={stats}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonPlayerStats={comparisonStats}
                />
            </div>
            <div>
                <PlayerWinPercentageChart
                    playerName={playerData.last_name}
                    wins={stats.totalWins}
                    draws={stats.totalDraws}
                    losses={stats.totalLosses}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonWins={comparisonStats.totalWins}
                    comparisonDraws={comparisonStats.totalDraws}
                    comparisonLosses={comparisonStats.totalLosses}
                />
                <PieChart width={400} height={400}>
                    <Pie
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={player1Goals}
                        cx="50%"
                        cy="50%"
                        paddingAngle={4}
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                    >
                        {player1Goals.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.colour}/>
                        ))}
                    </Pie>
                </PieChart>
                <PieChart width={400} height={400}>
                    <Pie
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={player1PercentageOfTeamGoalsContributedTo}
                        cx="50%"
                        cy="50%"
                        paddingAngle={4}
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                    >
                        {player1PercentageOfTeamGoalsContributedTo.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.colour}/>
                        ))}
                    </Pie>
                </PieChart>
                <PieChart width={400} height={400}>
                    <Pie
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={player1TeamGoalsScored}
                        cx="50%"
                        cy="50%"
                        paddingAngle={4}
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                    >
                        {player1TeamGoalsScored.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.colour}/>
                        ))}
                    </Pie>
                </PieChart>
                <PieChart width={400} height={400}>
                    <Pie
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={player1TeamGoalsConceded}
                        cx="50%"
                        cy="50%"
                        paddingAngle={4}
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                    >
                        {player1TeamGoalsConceded.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.colour}/>
                        ))}
                    </Pie>
                </PieChart>
                <PieChart width={400} height={400}>
                    <Pie
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={minutesPlayed}
                        cx="50%"
                        cy="50%"
                        paddingAngle={4}
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                    >
                        {minutesPlayed.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.colour}/>
                        ))}
                    </Pie>
                </PieChart>
                <BarChart
                    data={playerGoalsByMinute}
                    width={400}
                    height={520}
                    layout="vertical"
                    margin={{top: 20, left: 50, right: 20, bottom: 50}}>
                    <text x={500 / 2} y={10} fill="black" textAnchor="middle" dominantBaseline="central">
                        <tspan fontSize="14"></tspan>
                    </text>
                    <XAxis
                        type="number"
                        tick={{fontSize: 13}}
                        domain={[0, 35]}
                    />

                    <YAxis
                        dataKey="name"
                        type="category"
                        tick={{fontSize: 13}}
                    />
                    <Tooltip/>
                    <Bar
                        dataKey="minutesPlayed"
                        barSize={12}
                        stroke={"black"}
                        strokeWidth={0.5}
                        fill="#86f7aa"
                    />
                    <Bar
                        dataKey="goals"
                        barSize={12}
                        stroke={"black"}
                        strokeWidth={0.5}
                        fill="#ffd19c"
                    />
                    <Bar
                        dataKey="assists"
                        barSize={12}
                        stroke={"black"}
                        strokeWidth={0.5}
                        fill="aqua"
                    />
                </BarChart>
            </div>

        </div>
    )


};


export default Player;