import React, {useEffect, useMemo, useRef, useState} from "react";
import './playerScreen.css';
import {
    Bar,
    CartesianGrid, Cell,
    ComposedChart, Legend, Rectangle,
    ReferenceArea,
    ResponsiveContainer,
    Scatter, Tooltip, TooltipProps,
    XAxis,
    YAxis,
    ZAxis
} from "recharts";
import {PlayerAppearance} from "./types";
import {useParams} from "react-router-dom";
import {convertDateStringToDate, dateFormatter} from "./dateUtils";

// const initialDataToUse: PlayerAppearance[] = rawData.map(data => ({
//     ...data,
//     minutes: [data.played_from_minute, data.played_from_minute + data.minutes_played]
// }));

const PlayerScreen: React.FC = () => {
    const {playerId} = useParams<{ playerId: string }>();
    const [playerData, setPlayerData] = useState<PlayerAppearance[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlayerData = async () => {
            try {
                const response = await fetch(`http://localhost:8080/players/${playerId}/games`);
                const playerData: PlayerAppearance[] = await response.json();
                setPlayerData(playerData);
            } catch (error) {
                setError('Failed to fetch player data');
            }
        };
        fetchPlayerData();

    }, [playerId]);


    return (
        <div className="graph">
            <ZoomableChart data={playerData} />
        </div>
    );
};

export default PlayerScreen;


const seedRandom = (seed: number) => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
};

// export function simulateData(start = '2024-01-01T00:00:00Z', end = '2024-01-02T00:00:00Z'): DataPoint[] {
//     const simulatedData = [];
//     let baseValue = 50;
//     for (let currentDate = new Date(start); currentDate <= new Date(end); currentDate.setTime(currentDate.getTime() + 600000)) {
//         const seed = currentDate.getTime();
//         baseValue = Math.max(
//             (baseValue + 0.5 * (currentDate.getTime() - new Date(start).getTime()) / (new Date(end).getTime() - new Date(start).getTime()) * 100 +
//                 (seedRandom(seed) - 0.5) * 20 +
//                 (seedRandom(seed + 1) < 0.1 ? (seedRandom(seed + 2) - 0.5) * 50 : 0) +
//                 Math.sin(currentDate.getTime() / 3600000) * 10) *
//             (1 + (seedRandom(seed + 3) - 0.5) * 0.2),
//             1
//         );
//         simulatedData.push({
//             date: currentDate.toISOString(),
//             events: Math.max(Math.floor(baseValue), 1)
//         });
//     }
//     return simulatedData;
// }




// const data = rawData.map((item) => ({
//     ...item,
//     goal_minutes: item.goal_minutes.length > 0 ? item.goal_minutes : null,
//     assist_minutes: item.assist_minutes.length > 0 ? item.assist_minutes : null,
//     minutes: [item.played_from_minute, item.played_from_minute + item.minutes_played]
// }));

type ZoomableChartProps = {
    data?: any;
};

export function ZoomableChart({ data: initialData }: ZoomableChartProps) {
    const [data, setData] = useState<PlayerAppearance[]>(initialData || []);
    const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
    const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
    const [startGame, setStartGame] = useState<number | null>(null);
    const [endGame, setEndGame] = useState<number | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);

    const currentClubIdRef = useRef<number>(-1);
    const currentClubColour = useRef<string>("");

    useEffect(() => {
        if (initialData?.length) {
            setData(initialData);
            setStartGame(initialData[0].game_number);
            setEndGame(initialData[initialData.length - 1].game_number);
        }
    }, [initialData]);

    const zoomedData = useMemo(() => {
        if (!startGame || !endGame) {
            return data;
        }

        const dataPointsInRange = data.filter(
            (dataPoint) => dataPoint.game_number >= startGame && dataPoint.game_number <= endGame
        );

        // Ensure we have at least two data points for the chart to prevent rendering a single dot
        return dataPointsInRange.length > 1 ? dataPointsInRange : data.slice(0, 2);
    }, [startGame, endGame, data]);

    const scatterData = useMemo(() => {
        return zoomedData.flatMap((item) => {
            // Combine goals, assists, and other events into a unified array
            const events: { game_number: number; minute: number; size: number; color: string; shape: string }[] = [];

            // Add goal events
            item.goal_minutes.forEach((minute) => {
                events.push({ game_number: item.game_number, minute, size: 5, color: 'blue', shape: 'rectangle' });
            });

            item.penalty_goal_minutes.forEach((minute) => {
                events.push({ game_number: item.game_number, minute, size: 5, color: 'gold', shape: 'rectangle' });
            })

            // Add assist events
            item.assist_minutes.forEach((minute) => {
                events.push({ game_number: item.game_number, minute, size: 5, color: 'green', shape: 'rectangle' });
            });

            // Add yellow card events
            item.yellow_minutes.forEach((minute) => {
                events.push({ game_number: item.game_number, minute, size: 5, color: 'yellow', shape: 'rectangle' });
            });

            // Add red card events
            item.red_minutes.forEach((minute) => {
                events.push({ game_number: item.game_number, minute, size: 5, color: 'red', shape: 'rectangle' });
            });

            // Add appearance event
            if (item.result === "Win") {
                events.push({ game_number: item.game_number, minute: -5, size: 5, color: 'green', shape: 'rectangle' });
            }

            if (item.result === "Draw") {
                events.push({ game_number: item.game_number, minute: -5, size: 5, color: 'yellow', shape: 'rectangle' });
            }

            if (item.result === "Loss") {
                events.push({ game_number: item.game_number, minute: -5, size: 5, color: 'red', shape: 'rectangle' });
            }

            return events;
        });
    }, [zoomedData]);

    const calcuateSize = (minValue: number, maxValue: number): number => {
        const maxLength = 600;
        const minLength = 20;

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

    const barChartWidth = useMemo(() => {
        return calcuateSize(0.1, 20);
    }, [zoomedData]);

    const strokeWidth = useMemo(() => {
        return calcuateSize(0.002, 1.2);
    }, [zoomedData]);

    const scatterDotRadius = useMemo(() => {
        return calcuateSize(2.5, 8);
    }, [zoomedData]);

    const rectangleWidth = useMemo(() => {
        return calcuateSize(4, 19);
    }, [zoomedData]);

    const rectangleHeight = useMemo(() => {
        return calcuateSize(7, 22);
    }, [zoomedData]);

    const total = useMemo(
        () => zoomedData.length,
        [zoomedData]
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

    const handleReset = () => {
        setStartGame(data[0].game_number);
        setEndGame(data[data.length - 1].game_number);
    };

    const handleZoom = (e: React.WheelEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        // e.preventDefault();
        if (!data.length || !chartRef.current) return;

        let zoomFactor = 0.1;
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

        const currentRange = (endGame || data[data.length - 1].game_number) - (startGame || data[0].game_number);
        const zoomAmount = currentRange * zoomFactor * direction;

        const chartRect = chartRef.current.getBoundingClientRect();
        const mouseX = clientX - chartRect.left;
        const chartWidth = chartRect.width;
        const mousePercentage = mouseX / chartWidth;

        const currentStartGame = startGame || data[0].game_number;
        const currentEndGame = endGame || data[data.length - 1].game_number;

        if (currentEndGame - currentStartGame <= 15 && zoomAmount > 0) {
            return;
        }

        const newStartGame = currentStartGame + zoomAmount * mousePercentage;
        const newEndGame = currentEndGame - zoomAmount * (1 - mousePercentage);

        setStartGame(newStartGame);
        setEndGame(newEndGame);
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const gameNumber = payload[0].payload.game_number;
            console.log(gameNumber);
            const appearance = data[gameNumber - 1];


            console.log(payload.assist_minutes);
            return (
                <div className="custom-tooltip">
                    <p className="label">{dateFormatter.format(convertDateStringToDate(appearance.date))}</p>
                    <p className="label">{`${appearance.home_club_goals} ${appearance.away_club_goals}`}</p>
                    <p className="label">{`${appearance.competition_name}`}</p>
                    <p className="desc">Anything you want can be displayed here.</p>
                </div>
            );
        }

        return null;
    };

    const getBarColor = (clubId: number): string => {
        const hash = clubId * 2654435761 % 2 ** 32;

        const r = (hash >> 16) & 0xFF; // Red component
        const g = (hash >> 8) & 0xFF;  // Green component
        const b = hash & 0xFF;         // Blue component

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    const formatXAxis = (tickItem: number) => {
    };

    return (
        <div className="h-full" ref={chartRef}>
            <div className="h-full" onWheel={handleZoom} onTouchMove={handleZoom} ref={chartRef}
                 style={{touchAction: 'none'}}>
                <div className="flex justify-end my-2 sm:mb-4">
                    <button onClick={handleReset} disabled={!startGame && !endGame} className="text-xs sm:text-sm">
                        Reset
                    </button>
                </div>
                <div style={{width: '1400px', height: '600px'}}>
                    <ComposedChart
                        width={1400}
                        height={500}
                        data={zoomedData}
                        margin={{
                            top: 10,
                            right: 10,
                            left: 0,
                            bottom: 0,
                        }}
                        syncId="chartId"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {/*<defs>*/}
                        {/*    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">*/}
                        {/*        <stop offset="5%" stopColor={chartConfig.events.color} stopOpacity={0.8} />*/}
                        {/*        <stop offset="95%" stopColor={chartConfig.events.color} stopOpacity={0.1} />*/}
                        {/*    </linearGradient>*/}
                        {/*</defs>*/}
                        <CartesianGrid
                            vertical={false}
                            horizontal={false}
                        />
                        <XAxis
                            dataKey="game_number"
                            tickLine={false}
                            axisLine={false}
                            type='number'
                            // tickMargin={4}
                            // minTickGap={16}
                            domain={["dataMin", "dataMax" + 1]}
                            style={{fontSize: '10px', userSelect: 'none'}}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 120]}
                            style={{fontSize: '10px', userSelect: 'none'}}
                            width={30}
                        />
                        <ZAxis range={[25, 31]}/>
                        {/*<Tooltip/>*/}

                        <Tooltip content={<CustomTooltip/>}/>

                        <Legend/>

                        <Bar
                            type="monotone"
                            dataKey="minutes_played"
                            // fill="silver"
                            barSize={barChartWidth}
                            fillOpacity={0.25}
                            stroke={"black"}
                            strokeWidth={strokeWidth}
                            // fill="url(#colorEvents)"
                            isAnimationActive={false}
                            // onClick={handleClick}
                        >
                            {
                                zoomedData.map((entry, index) => {
                                    // Check if the club_id has changed, and update the currentClubId ref
                                    if (entry.club_id !== currentClubIdRef.current) {
                                        currentClubIdRef.current = entry.club_id;
                                        currentClubColour.current = getBarColor(currentClubIdRef.current);
                                    }

                                    return (
                                        <Cell key={index} fill={currentClubColour.current}/>
                                    );
                                })
                            }
                        </Bar>

                        <Scatter
                            name="d"
                            data={scatterData}
                            dataKey="minute"
                            isAnimationActive={false}
                            shape={(props) => {
                                const {cx, cy, size, fill} = props;

                                switch (props.payload.shape) {
                                    case 'rectangle':
                                        return <rect
                                            x={cx - rectangleWidth / 2}
                                            y={cy - rectangleHeight / 2}
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


                        {/*</ScatterChart>*/}
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
                </div>
            </div>
        </div>
    );
}


const handleClick = (data, index) => {
    console.log('Bar clicked:', data);
    // Add your custom logic here
};















// Render the chart
// export default class Example extends PureComponent {
//     render() {
//         return (
//             <div>
//                 <h3>Hello</h3>
//                 <ResponsiveContainer width="100%" height={600}>
//                     <ComposedChart
//                         data={data}
//                         syncId="anyId"
//                         margin={{
//                             top: 5,
//                             right: 30,
//                             left: 20,
//                             bottom: 5,
//                         }}
//                     >
//                         <CartesianGrid strokeDasharray="3 3"/>
//                         <XAxis dataKey="game_number"
//                                type="number"
//                                domain={[1, 41]}/>
//                         <YAxis
//                             type="number"
//                             domain={[0, 90]}
//                             />
//                         <Tooltip
//                             content={<CustomTooltip />}
//                             cursor={{ strokeDasharray: '3 3' }}
//                         />
//                         <Legend/>
//                         <Area
//                             type="monotone"
//                             dataKey="minutes"
//                             stroke="black"
//                             fill="#faf6eb"
//                             connectNulls
//                             dot={false}
//                             activeDot={false}
//                             isAnimationActive={false}
//                         />
//                          Original Line
//                          Scatter plots
//                         <Scatter
//                             name="Goals"
//                             data={goalData}
//                             dataKey="goal_minute"
//                             fill="blue"
//                             isAnimationActive={false}
//                             cursor="pointer"
//                             r={5}
//                             strokeWidth={2}
//                             stroke="#ffffff"  // white border around points
//                         />
//                         <Scatter
//                             name="Assists"
//                             data={assistData}
//                             dataKey="assist_minute"
//                             fill="green"
//                             isAnimationActive={false}
//                         />
//                         <Brush dataKey="game_number" height={30} stroke="#8884d8" />
//                     </ComposedChart>
//                 </ResponsiveContainer>
//             </div>
//         );
//     }
// }
//
// const CustomTooltip = ({ payload, label, active }) => {
//     if (active && payload && payload.length) {
//         // Get all points at this x-coordinate
//         const points = payload.filter(p => p.payload.goal_minute !== undefined || p.payload.assist_minute !== undefined);
//
//         if (points.length > 0) {
//             return (
//                 <div style={{backgroundColor: 'white', border: '1px solid #ccc', padding: '10px', borderRadius: '5px'}}>
//                     <p>{`Game: ${points[0].payload.game_number}`}</p>
//                     {points.map((point, index) => {
//                         const type = point.payload.goal_minute ? 'Goal' : 'Assist';
//                         const minute = point.payload.goal_minute || point.payload.assist_minute;
//                         return (
//                             <p key={index}>{`${type}: Minute ${minute}`}</p>
//                         );
//                     })}
//                 </div>
//             );
//         }
//
//         // Your existing tooltip for non-scatter data
//         const data = payload[0].payload;
//         return (
//             <div style={{backgroundColor: '#bc3030', border: '1px solid #ccc', padding: '10px', borderRadius: '5px'}}>
//                 <p>{`Game Number: ${label}`}</p>
//                 <p>{`Minutes Played: ${data.minutes_played}`}</p>
//                 <p>{`Goals: ${data.goal_minutes ? data.goal_minutes.length : 0}`}</p>
//                 <p>{`Goal mins: ${data.goal_minutes ? data.goal_minutes.join(",") : 0}`}</p>
//                 <p>{`Assists: ${data.assist_minutes ? data.assist_minutes.length : 0}`}</p>
//             </div>
//         );
//     }
//     return null;
// };
//


// const assistData = zoomedData.flatMap((item) => {
//     const assistEntries = item.assist_minutes && item.assist_minutes.length > 0
//         ? item.assist_minutes.map((minute) => ({
//             game_number: item.game_number,
//             minute,
//         }))
//         : [];
//
//     return [...assistEntries];
// });
//
//
// const scatterData = data.flatMap((item) => {
//     // Handle goal minutes
//     const goalEntries = item.goal_minutes && item.goal_minutes.length > 0
//         ? item.goal_minutes.map((minute) => ({
//             ...item,
//             goal_minute: minute,
//             type: 'goal',
//         }))
//         : []; // Add -1 if no goals
//
//     // Handle assist minutes
//     const assistEntries = item.assist_minutes && item.assist_minutes.length > 0
//         ? item.assist_minutes.map((minute) => ({
//             ...item,
//             assist_minute: minute,
//             type: 'assist',
//         }))
//         : []; // Add -1 if no assists
//
//     return [...goalEntries, ...assistEntries];
// });


// const PlayerScreen: React.FC = () => {
//     const {playerId} = useParams<{ playerId: string }>();
//     const [player, setPlayer] = useState<Player | null>(null);
//     const [seasonStats, setSeasonStats] = useState<SeasonStats[]>([]);
//     const [error, setError] = useState<string | null>(null);
//     const [loading, setLoading] = useState<boolean>(true); // Add loading state
//     const [filters, setFilters] = useState<string[]>(['all']);
//
//     const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//         const value = event.target.value;
//         setFilters(prev => {
//             if (value === 'all') {
//                 return ['all'];
//             }
//             const newFilters = prev.filter(f => f !== 'all');
//             if (newFilters.includes(value)) {
//                 return newFilters.filter(f => f !== value);
//             } else {
//                 if (filters.length === 3) {
//                     return ['all'];
//                 } else {
//                     return [...newFilters, value];
//                 }
//             }
//         });
//     };
//
//     useEffect(() => {
//         const fetchPlayerData = async () => {
//             setLoading(true); // Set loading to true when starting fetch
//             try {
//                 const [playerResponse, statsResponse] = await Promise.all([
//                     fetch(`http://localhost:8080/players/${playerId}`),
//                     fetch(`http://localhost:8080/players/${playerId}/season-stats`)
//                 ]);
//
//                 // Fix error check condition
//                 if (!playerResponse.ok || !statsResponse.ok) {
//                     throw new Error('Network response was not ok');
//                 }
//
//                 const playerData: Player[] = await playerResponse.json();
//                 const statsData: SeasonStats[] = await statsResponse.json();
//
//                 setPlayer(playerData[0]);
//                 setSeasonStats(statsData);
//             } catch (error) {
//                 setError('Failed to fetch player data');
//             } finally {
//                 setLoading(false); // Set loading to false after fetching
//             }
//         };
//
//         fetchPlayerData();
//     }, [playerId]);
//
//     if (loading) return <div>Loading...</div>; // Show loading state
//     if (error) return <div>{error}</div>; // Show error message
//
//     return (
//         <div className="player-screen">
//             {player ? (
//                 <>
//                     <h1>{`${player.first_name} ${player.last_name}`}</h1>
//                     <img
//                         src={player.image_url || 'fake_image.jpg'}
//                         alt={`${player.first_name} ${player.last_name}`}
//                         style={{width: '150px', height: '150px', borderRadius: '50%'}} // Adjust image styling
//                     />
//                     <p><strong>Country:</strong> {player.country_of_citizenship}</p>
//                     <p><strong>Age:</strong> {player.age}</p>
//                     <p><strong>Position:</strong> {player.sub_position}</p>
//                     <p><strong>Date of Birth:</strong> {player.date_of_birth}</p>
//
//                     {seasonStats.length > 0 && (
//                         <div className="table-container">
//                             <table className="player-stats-table">
//                                 <thead>
//                                 <tr>
//                                     <th>Season</th>
//                                     <th>Club Name</th>
//                                     <th>Competition</th>
//                                     <th>Appearances</th>
//                                     <th>Goals</th>
//                                     <th>Assists</th>
//                                     <th>Yellow Cards</th>
//                                     <th>Red Cards</th>
//                                     <th>Minutes Played</th>
//                                     <th>Mins per Goal</th>
//                                     <th>Mins per Assist</th>
//                                     <th>Mins per Yellow Card</th>
//                                     <th>Mins per Red Card</th>
//                                 </tr>
//                                 </thead>
//                                 <div className="filter-container">
//                                     <fieldset>
//                                         <legend>Filter by competition type:</legend>
//                                         <label>
//                                             <input
//                                                 type="checkbox"
//                                                 value="all"
//                                                 checked={filters.includes('all')}
//                                                 onChange={handleFilterChange}
//                                             /> All
//                                         </label>
//                                         <label>
//                                             <input
//                                                 type="checkbox"
//                                                 value="league"
//                                                 checked={filters.includes('league')}
//                                                 onChange={handleFilterChange}
//                                             /> League
//                                         </label>
//                                         <label>
//                                             <input
//                                                 type="checkbox"
//                                                 value="europe"
//                                                 checked={filters.includes('europe')}
//                                                 onChange={handleFilterChange}
//                                             /> Europe
//                                         </label>
//                                         <label>
//                                             <input
//                                                 type="checkbox"
//                                                 value="domestic cup"
//                                                 checked={filters.includes('domestic cup')}
//                                                 onChange={handleFilterChange}
//                                             /> Domestic Cup
//                                         </label>
//                                         <label>
//                                             <input
//                                                 type="checkbox"
//                                                 value="other"
//                                                 checked={filters.includes('other')}
//                                                 onChange={handleFilterChange}
//                                             /> Other
//                                         </label>
//                                     </fieldset>
//                                 </div>
//
//                                 <tbody>
//                                 {seasonStats
//                                     .filter(stat =>
//                                         filters.includes('all') ||
//                                         filters.includes(stat.competition_type.toLowerCase())
//                                     )
//                                     .map((stat, index) => (
//                                         <tr key={index}>
//                                             <td>{stat.season}/{stat.season - 1999}</td>
//                                             <td>{stat.club_name}</td>
//                                             <td><span>
//                                     <img
//                                         src={`https://flagicons.lipis.dev/flags/4x3/${stat.competition_country_code}.svg`}
//                                         alt={`${stat.competition_country}`}
//                                         style={{width: '30px', height: '20px', marginRight: '10px', borderRadius: 1}}/>
//                                                 {stat.competition_name}</span></td>
//                                             <td>{stat.total_appearances}</td>
//                                             <td>{stat.total_goals}</td>
//                                             <td>{stat.total_assists}</td>
//                                             <td>{stat.total_yellow_cards}</td>
//                                             <td>{stat.total_red_cards}</td>
//                                             <td>{stat.total_minutes_played}</td>
//                                             <td>{stat.mins_per_goal ?? '-'}</td>
//                                             <td>{stat.mins_per_assist ?? '-'}</td>
//                                             <td>{stat.mins_per_yellow_card ?? '-'}</td>
//                                             <td>{stat.mins_per_red_card ?? '-'}</td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     )}
//                 </>
//             ) : (
//                 <div>No player data found</div>
//             )}
//         </div>
//     );
// };
//
// export default PlayerScreen;
