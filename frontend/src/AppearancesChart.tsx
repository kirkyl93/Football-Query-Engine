import React, {useEffect, useMemo, useRef, useState} from "react";
import {
    EventType,
    HomeOrAwayOptions,
    PlayerAppearance,
    PlayerFilterState,
    PlayerSeasonsCompetitionsAndClubs, PlayerTotals
} from "./types";
import {convertDateStringToDate, dateFormatter, formatSeason} from "./dateUtils";
import AppearancesChartTitle from "./AppearancesChartTitle";
import AppearancesChartFilterBar from "./AppearancesChartFilterBar";
import {getColour} from "./colourUtil";
import './AppearancesChart.css';
import {
    Bar,
    Cell,
    ComposedChart,
    ReferenceArea,
    ResponsiveContainer,
    Scatter,
    Tooltip,
    TooltipProps,
    XAxis,
    YAxis
} from "recharts";

type AppearancesChartProps = {
    data?: PlayerAppearance[];
    onZoomChange: (zoomedData: PlayerAppearance[]) => void;

};

export function AppearancesChart({data: initialData, onZoomChange: onZoomChange}: AppearancesChartProps) {
    const [isPlayerDrawerOpen, setIsPlayerDrawerOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    const [data, setData] = useState<PlayerAppearance[]>(initialData || []);
    const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
    const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
    const [startGame, setStartGame] = useState<number | null>(null);
    const [endGame, setEndGame] = useState<number | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);

    const [playerFilterState, setPlayerFilterState] = useState<PlayerFilterState>({
        selectedSeasons: [],
        selectedCompetitions: [],
        selectedClubsPlayedFor: [],
        selectedClubsPlayedAgainst: [],
        selectedHomeOrAway: HomeOrAwayOptions.EITHER,
        selectedEvents: {
            [EventType.Goals]: false,
            [EventType.Penalties]: false,
            [EventType.OwnGoals]: false,
            [EventType.Assists]: false,
            [EventType.Yellows]: false,
            [EventType.Reds]: false
        }
    });

    const [playerSeasonsCompetitionAndClubs, setPlayerSeasonsCompetitionsAndClubs] = useState<PlayerSeasonsCompetitionsAndClubs>({
        seasons: [],
        leagueCompetitions: [],
        europeanCompetitions: [],
        clubsPlayedFor: [],
        clubsPlayedAgainst: []
    })

    const currentClubIdRef = useRef<number>(-1);
    const currentClubColour = useRef<string>("");

    useEffect(() => {
        if (initialData === undefined || !initialData.length) {
            return;
        }

        setData(initialData);

        const finalSeason = initialData[initialData.length - 1].season;
        const seasons = [...new Set(initialData.map(a => a.season))];

        const clubsPlayedForMap = new Map(initialData.map(a => [a.club_id, a.club_id === a.home_club_id ? a.home_club_name : a.away_club_name]));
        const clubsPlayedFor = [...clubsPlayedForMap.entries()];

        const clubsPlayedAgainstMap = new Map(initialData.map(a => [a.club_id === a.home_club_id ? a.away_club_id : a.home_club_id, a.club_id === a.home_club_id ? a.away_club_name : a.home_club_name]));
        const clubsPlayedAgainst = [...clubsPlayedAgainstMap.entries()];

        const leagueCompetitions = [...new Set(initialData
            .filter(a => a.competition_type === 'League')
            .map(a => a.competition_name))]

        const europeanCompetitions = [...new Set(initialData
            .filter(a => a.competition_type === 'Europe')
            .map(a => a.competition_name))];

        setPlayerFilterState(prev => ({
            ...prev,
            selectedSeasons: [finalSeason],
        }));

        setPlayerSeasonsCompetitionsAndClubs(prev => ({
            ...prev,
            seasons: seasons,
            leagueCompetitions: leagueCompetitions,
            europeanCompetitions: europeanCompetitions,
            clubsPlayedFor: clubsPlayedFor,
            clubsPlayedAgainst: clubsPlayedAgainst
        }));

    }, [initialData]);


    const filteredData = useMemo(() => {
        const result = data.filter(a => {
            const matchesSeasons = playerFilterState.selectedSeasons.length === 0 ||
                playerFilterState.selectedSeasons.includes(a.season);

            if (!matchesSeasons) {
                return false;
            }

            const matchesCompetitions = playerFilterState.selectedCompetitions.length === 0 ||
                playerFilterState.selectedCompetitions.includes(a.competition_name);

            if (!matchesCompetitions) {
                return false;
            }

            const matchesClubsPlayedFor = playerFilterState.selectedClubsPlayedFor.length === 0 ||
                playerFilterState.selectedClubsPlayedFor.includes(a.club_id);

            if (!matchesClubsPlayedFor) {
                return false;
            }
            const matchesClubsPlayedAgainst = playerFilterState.selectedClubsPlayedAgainst.length === 0 ||
                playerFilterState.selectedClubsPlayedAgainst.includes(a.club_id === a.home_club_id ? a.away_club_id : a.home_club_id);

            if (!matchesClubsPlayedAgainst) {
                return false;
            }

            return !playerFilterState.selectedHomeOrAway || playerFilterState.selectedHomeOrAway === HomeOrAwayOptions.EITHER ||
                (playerFilterState.selectedHomeOrAway === HomeOrAwayOptions.HOME && a.club_id === a.home_club_id) ||
                (playerFilterState.selectedHomeOrAway === HomeOrAwayOptions.AWAY && a.club_id === a.away_club_id);
        }).map((a, index) => ({
            ...a,
            game_number: index + 1
        }));

        setStartGame(result[0]?.game_number);
        setEndGame(result[result.length - 1]?.game_number);

        return result;
    }, [data, playerFilterState]);

    const zoomedData = useMemo(() => {
        if (!startGame || !endGame) {
            return filteredData;
        }

        const dataPointsInRange = filteredData.filter(
            (dataPoint) => dataPoint.game_number >= startGame && dataPoint.game_number <= endGame
        );

        // Ensure we have at least two data points for the chart to prevent rendering a single dot
        return dataPointsInRange.length > 1 ? dataPointsInRange : filteredData.slice(0, 2);
    }, [startGame, endGame, filteredData]);

    const noEventFiltersSelected = useMemo(() => {
        const selectedEvents = playerFilterState.selectedEvents;

        return !selectedEvents.Goals && !selectedEvents.Penalties && !selectedEvents.OwnGoals
            && !selectedEvents.Assists && !selectedEvents.Yellows && !selectedEvents.Reds
    }, [playerFilterState])

    useEffect(() => {
        if (onZoomChange) {
            onZoomChange(zoomedData);
        }
    }, [zoomedData, onZoomChange]);

    const scatterData = useMemo(() => {
        return zoomedData.flatMap((item) => {
            const events: { game_number: number; minute: number; size: number; color: string; shape: string }[] = [];

            // Add goal events
            if (noEventFiltersSelected || playerFilterState.selectedEvents.Goals) {
                item.goal_minutes.forEach((minute) => {
                    events.push({game_number: item.game_number, minute, size: 5, color: 'blue', shape: 'rectangle'});
                });
            }

            if (noEventFiltersSelected || playerFilterState.selectedEvents.Penalties) {
                item.penalty_goal_minutes.forEach((minute) => {
                    events.push({game_number: item.game_number, minute, size: 5, color: 'gold', shape: 'rectangle'});
                })
            }

            if (noEventFiltersSelected || playerFilterState.selectedEvents.OwnGoals) {
                item.own_goal_minutes.forEach((minute) => {
                    events.push({game_number: item.game_number, minute, size: 5, color: 'pink', shape: 'rectangle'});
                })
            }

            // Add assist events
            if (noEventFiltersSelected || playerFilterState.selectedEvents.Assists) {
                item.assist_minutes.forEach((minute) => {
                    events.push({game_number: item.game_number, minute, size: 5, color: 'green', shape: 'rectangle'});
                });
            }

            // Add yellow card events
            if (noEventFiltersSelected || playerFilterState.selectedEvents.Yellows) {
                item.yellow_minutes.forEach((minute) => {
                    events.push({game_number: item.game_number, minute, size: 5, color: 'yellow', shape: 'rectangle'});
                });
            }

            // Add red card events
            if (noEventFiltersSelected || playerFilterState.selectedEvents.Reds) {
                item.red_minutes.forEach((minute) => {
                    events.push({game_number: item.game_number, minute, size: 5, color: 'red', shape: 'rectangle'});
                });

                // Only add red card yellows if we haven't already added yellows
                if (!noEventFiltersSelected && !playerFilterState.selectedEvents.Yellows) {
                    if (item.yellow_minutes.length > 1) {
                        item.yellow_minutes.forEach((minute) => {
                            events.push({
                                game_number: item.game_number,
                                minute,
                                size: 5,
                                color: 'yellow',
                                shape: 'rectangle'
                            });
                        });
                    }
                }
            }

            // Add appearance event
            if (item.result === "Win") {
                events.push({game_number: item.game_number, minute: -10, size: 5, color: 'green', shape: 'rectangle'});
            }

            if (item.result === "Draw") {
                events.push({game_number: item.game_number, minute: -10, size: 5, color: 'yellow', shape: 'rectangle'});
            }

            if (item.result === "Loss") {
                events.push({game_number: item.game_number, minute: -10, size: 5, color: 'red', shape: 'rectangle'});
            }

            return events;
        });
    }, [zoomedData]);

    const toggleDrawer = () => {
        setIsPlayerDrawerOpen(!isPlayerDrawerOpen);
    }

    const calculateSize = (minValue: number, maxValue: number): number => {
        const minLength = 20;
        const maxLength = 600;

        if (zoomedData.length <= minLength) {
            return maxValue;
        }

        if (zoomedData.length >= maxLength) {
            return minValue;
        }

        const normalizedLength = (zoomedData.length - minLength) / (maxLength - minLength);

        const scale = Math.pow(1 - normalizedLength, 3);

        return minValue + scale * (maxValue - minValue);
    };

    const calculateBarChartOpacity = (minValue: number, maxValue: number): number => {
        const minLength = 20;
        const maxLength = 600;

        if (zoomedData.length <= minLength) {
            return minValue;
        }

        if (zoomedData.length >= maxLength) {
            return maxValue;
        }

        const normalizedLength = (zoomedData.length - minLength) / (maxLength - minLength);
        const scale = Math.pow(normalizedLength, 3);

        return minValue + scale * (maxValue - minValue);
    }

    const barChartWidth = useMemo(() => {
        return calculateSize(0.7, 20);
    }, [zoomedData]);

    const strokeWidth = useMemo(() => {
        return calculateSize(0.002, 1.6);
    }, [zoomedData]);

    const scatterDotRadius = useMemo(() => {
        return calculateSize(2.5, 8);
    }, [zoomedData]);

    const rectangleWidth = useMemo(() => {
        return calculateSize(3.5, 11);
    }, [zoomedData]);

    const rectangleHeight = useMemo(() => {
        return calculateSize(5, 13);
    }, [zoomedData]);

    const barChartOpacity = useMemo(() => {
        return calculateBarChartOpacity(0.25, 3);
    }, [zoomedData]);

    const calculateDomain = useMemo(() => {
        if (playerSeasonsCompetitionAndClubs.europeanCompetitions.length === 0) {
            return [0, 90];
        }
        const maxMinutes = Math.max(...zoomedData.map(app => app.minutes_played[1]));
        return [0, maxMinutes];
    }, [zoomedData])

    const calculateGoalsAssistsAndCards = useMemo(
        () => {
            let playerTotals: PlayerTotals = {
                goals: 0,
                penalties: 0,
                ownGoals: 0,
                assists: 0,
                yellows: 0,
                reds: 0
            };


            zoomedData.map(app => {
                playerTotals.goals += app.goal_minutes.length;
                playerTotals.penalties += app.penalty_goals;
                playerTotals.ownGoals += app.own_goal_minutes.length;
                playerTotals.assists += app.assists;
                if (app.yellow_cards < 2) {
                    playerTotals.yellows += app.yellow_cards;
                }
                playerTotals.reds += app.red_cards;
                if (app.yellow_cards > 1) {
                    playerTotals.reds += 1;
                }
            })

            return playerTotals;

        }, [zoomedData]
    )

    const handleMouseDown = (e: any) => {
        if (e.activeLabel) {
            setRefAreaLeft(e.activeLabel);
            setIsSelecting(true);
        }
    };

    const handleMouseMove = (e: any) => {
        if (isSelecting && e.activeLabel) {
            setRefAreaRight(e.activeLabel);
        }
    };

    const handleMouseUp = () => {
        if (refAreaLeft && refAreaRight) {
            const [left, right] = [refAreaLeft, refAreaRight].sort((a, b) => a - b);
            setStartGame(left);
            setEndGame(right);
        }
        setRefAreaLeft(null);
        setRefAreaRight(null);
        setIsSelecting(false);
    };

    const handleZoomOut = () => {
        setStartGame(filteredData[0].game_number);
        setEndGame(filteredData[filteredData.length - 1].game_number);
    };

    const handleZoom = (e: React.WheelEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!filteredData.length || !chartRef.current) return;

        let zoomFactor = 0.05;
        let direction = 0;
        let clientX = 0;

        if ('deltaY' in e) {
            // Mouse wheel event
            direction = e.deltaY < 0 ? 1 : -1;
            clientX = e.clientX;
        } else if (e.touches.length === 2) {
            // Pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            const currentDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);

            if ((e as any).lastTouchDistance) {
                direction = currentDistance > (e as any).lastTouchDistance ? 1 : -1;
            }
            (e as any).lastTouchDistance = currentDistance;

            clientX = (touch1.clientX + touch2.clientX) / 2;
        } else {
            return;
        }

        const currentRange = (endGame || filteredData[filteredData.length - 1].game_number) - (startGame || filteredData[0].game_number);
        const zoomAmount = currentRange * zoomFactor * direction;

        const chartRect = chartRef.current.getBoundingClientRect();
        const mouseX = clientX - chartRect.left;
        const chartWidth = chartRect.width;
        const mousePercentage = mouseX / chartWidth;

        const currentStartGame = startGame || filteredData[0].game_number;
        const currentEndGame = endGame || filteredData[filteredData.length - 1].game_number;

        if (currentEndGame - currentStartGame <= 15 && zoomAmount > 0) {
            return;
        }

        const newStartGame = currentStartGame + zoomAmount * mousePercentage;
        const newEndGame = currentEndGame - zoomAmount * (1 - mousePercentage);

        setStartGame(newStartGame);
        setEndGame(newEndGame);
    };

    const CustomTooltip: React.FC<TooltipProps<number, string>> = ({active, payload, label}) => {
        if (active && payload && payload.length) {
            const gameNumber = payload[0].payload.game_number;
            const appearance = filteredData[gameNumber - 1];

            return (
                <div className="custom-tooltip">
                    <p>Season: {formatSeason(appearance.season)}</p>
                    <p>Date: {dateFormatter.format(convertDateStringToDate(appearance.date))}</p>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        lineHeight: '30px'
                    }}>
                        <img
                            src={`https://tmssl.akamaized.net/images/wappen/head/${appearance.home_club_id}.png`}
                            alt={appearance.home_club_name}
                            style={{width: '30px', verticalAlign: 'middle'}}
                            title={appearance.home_club_name}
                        />
                        <span
                            style={{lineHeight: '30px'}}>{appearance.home_club_goals} - {appearance.away_club_goals}</span>
                        <img
                            src={`https://tmssl.akamaized.net/images/wappen/head/${appearance.away_club_id}.png`}
                            alt={appearance.away_club_name}
                            style={{width: '30px', verticalAlign: 'middle'}}
                            title={appearance.away_club_name}
                        />
                    </div>

                    <p style={{fontWeight: "bold"}}>{`${appearance.competition_name}`}</p>
                    <p>Minutes: {appearance.minutes_played[1] - appearance.minutes_played[0]}</p>
                    <p>Goals: {appearance.goals}</p>
                    <p>Own goals: {appearance.own_goal_minutes.length}</p>
                    <p>Assists: {appearance.assists}</p>
                    <p>Yellows: {appearance.yellow_cards}</p>
                    <p>Reds: {appearance.red_cards}</p>
                </div>
            );
        }

        return null;
    };

    const getBarOutlineColour = (appearance: PlayerAppearance): string => {
        if (appearance.competition_type === 'League') {
            return 'black';
        }

        if (appearance.competition_type === 'Europe') {
            switch (appearance.competition_name) {
                case 'Champions League':
                    return '#FFBF00'
                case 'Europa League':
                    return 'silver'
                case 'Europa Conference League':
                    return 'bronze'
            }
        }

        if (appearance.competition_type === 'Domestic Cup') {
            return 'red';
        }

        return 'black';
    }

    return (
        <div className="chart-container" ref={chartRef}>
            <div className="header-container">
                <AppearancesChartTitle
                    filterState={playerFilterState}
                />
                <div className="button-container">
                    <button onClick={handleZoomOut} disabled={!startGame && !endGame} className="filter-button-player">
                        <img
                            src={'/magnifying-glass.png'}
                            alt={`Zoom out`}
                            style={{width: '20px', height: '20px'}}
                        />
                    </button>
                    <button onClick={toggleDrawer} className="filter-button-player">
                        Filter
                    </button>
                </div>
            </div>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: '600',
                marginTop: '25px'
            }}>
                {zoomedData.length > 1 ? `Between ${dateFormatter.format(convertDateStringToDate(zoomedData[0].date))} and ${dateFormatter.format(convertDateStringToDate(zoomedData[zoomedData.length - 1].date))}` : null}
            </div>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '7px',
                marginBottom: '25px',
                fontSize: '14px'
            }}>
                {zoomedData.length} Games

                {(noEventFiltersSelected || playerFilterState.selectedEvents.Goals) ? (
                    <>
                        <span className="square-title" style={{backgroundColor: "blue"}}></span>
                        {calculateGoalsAssistsAndCards.goals !== 1 ? `${calculateGoalsAssistsAndCards.goals} Goals` : `1 Goal`}
                    </>
                ) : null}

                {(noEventFiltersSelected || playerFilterState.selectedEvents.Penalties) ? (
                    <>
                        <span className="square-title" style={{backgroundColor: "gold"}}></span>
                        {calculateGoalsAssistsAndCards.penalties !== 1 ? `${calculateGoalsAssistsAndCards.penalties} Penalties` : `1 Penalty`}
                    </>
                ) : null}

                {(noEventFiltersSelected || playerFilterState.selectedEvents.OwnGoals) ? (
                    <>
                        <span className="square-title" style={{backgroundColor: "pink"}}></span>
                        {calculateGoalsAssistsAndCards.ownGoals !== 1 ? `${calculateGoalsAssistsAndCards.ownGoals} Own goals` : `1 Own goal`}
                    </>
                ) : null}

                {(noEventFiltersSelected || playerFilterState.selectedEvents.Assists) ? (
                    <>
                        <span className="square-title" style={{backgroundColor: "green"}}></span>
                        {calculateGoalsAssistsAndCards.assists !== 1 ? `${calculateGoalsAssistsAndCards.assists} Assists` : `1 Assist`}
                    </>
                ) : null}

                {(noEventFiltersSelected || playerFilterState.selectedEvents.Yellows) ? (
                    <>
                        <span className="square-title" style={{backgroundColor: "yellow"}}></span>
                        {calculateGoalsAssistsAndCards.yellows !== 1 ? `${calculateGoalsAssistsAndCards.yellows} Yellows` : `1 Yellow`}
                    </>
                ) : null}

                {(noEventFiltersSelected || playerFilterState.selectedEvents.Reds) ? (
                    <>
                        <span className="square-title" style={{backgroundColor: "red"}}></span>
                        {calculateGoalsAssistsAndCards.reds !== 1 ? `${calculateGoalsAssistsAndCards.reds} Reds` : `1 Red`}
                    </>
                ) : null}
            </div>
            <AppearancesChartFilterBar
                isOpen={isPlayerDrawerOpen}
                playerFilterState={playerFilterState}
                playerSeasonsCompetitionsAndClubs={playerSeasonsCompetitionAndClubs}
                onFilterChange={setPlayerFilterState}
                onClose={toggleDrawer}
            />
            <div className="h-full" onWheel={handleZoom} onTouchMove={handleZoom} ref={chartRef}
                 style={{touchAction: 'none'}}>
                <div style={{height: '500px'}}>
                    <ResponsiveContainer>
                        <ComposedChart
                            data={zoomedData}
                            margin={{
                                top: 20,
                                right: 20,
                                left: 20,
                                bottom: 40,
                            }}
                            syncId="chartId"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            <XAxis
                                dataKey={"game_number"}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                                label={{
                                    value: "Game Number",
                                    dx: 0,
                                    dy: 30,
                                    style: {fontSize: 14, userSelect: 'none'},
                                }}
                                type='number'
                                tickCount={10}
                                domain={["dataMin", "dataMax" + 1]}
                                style={{fontSize: '12px', userSelect: 'none'}}
                                tick={{dy: 10}}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickCount={9}
                                label={{
                                    value: "Minute",
                                    dx: -30,
                                    dy: 0,
                                    angle: -90,
                                    style: {fontSize: 14, userSelect: 'none'},
                                }}
                                domain={calculateDomain}
                                style={{fontSize: '12px', userSelect: 'none'}}
                                tick={{dx: -10}}
                                tickFormatter={(value) => (value > 0 ? value : "")}
                            />
                            <Tooltip content={<CustomTooltip/>}/>

                            <Bar
                                type="monotone"
                                dataKey="minutes_played"
                                barSize={barChartWidth}
                                fillOpacity={barChartOpacity}
                                stroke={"black"}
                                strokeWidth={strokeWidth}
                                isAnimationActive={false}
                            >
                                {
                                    zoomedData.map((entry, index) => {
                                        // Check if the club_id has changed, and update the currentClubId ref
                                        if (entry.club_id !== currentClubIdRef.current) {
                                            currentClubIdRef.current = entry.club_id;
                                            currentClubColour.current = getColour(currentClubIdRef.current);
                                        }

                                        return (
                                            <Cell key={index} fill={currentClubColour.current}
                                                  stroke={getBarOutlineColour(entry)}/>
                                        );
                                    })
                                }
                            </Bar>

                            <Scatter
                                name="d"
                                data={scatterData}
                                dataKey="minute"
                                isAnimationActive={false}
                                shape={(props: {
                                    cx?: number;
                                    cy?: number;
                                    size?: number;
                                    fill?: string;
                                    payload?: any
                                }) => {
                                    const {cx, cy, size, fill} = props;

                                    switch (props.payload.shape) {
                                        case 'rectangle':
                                            return <rect
                                                x={cx! - (rectangleWidth / 2)}
                                                y={cy! - rectangleHeight / 2}
                                                width={rectangleWidth}
                                                height={rectangleHeight}
                                                stroke={"black"}
                                                strokeWidth={strokeWidth}
                                                fill={props.payload.color}
                                            />;
                                        default:
                                            return <circle cx={cx} cy={cy} r={scatterDotRadius}
                                                           fill={props.payload.color}/>;
                                    }
                                }}
                            />
                            {refAreaLeft && refAreaRight && (
                                <ReferenceArea
                                    x1={refAreaLeft}
                                    x2={refAreaRight}
                                    strokeOpacity={0.3}
                                    fill="hsl(var(--foreground))"
                                    fillOpacity={0.05}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                <div ref={drawerRef}>
                </div>
            </div>
        </div>
    );
}
