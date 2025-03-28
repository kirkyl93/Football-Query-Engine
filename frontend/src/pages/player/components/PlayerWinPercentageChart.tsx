import React, {useState} from "react";
import {Pie, PieChart, Cell} from "recharts";
import {renderActiveShape} from "../../../lib/PieChartUtils";


interface PlayerWinPercentageProps {
    playerName: string;
    wins: number,
    draws: number,
    losses: number,
    comparisonPlayerName: string;
    comparisonWins: number;
    comparisonDraws: number;
    comparisonLosses: number;
}

const PlayerWinPercentageChart: React.FC<PlayerWinPercentageProps> = (
    {
        playerName, wins, draws, losses, comparisonPlayerName, comparisonWins, comparisonDraws, comparisonLosses
    }) => {

    const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
    const [activeComparisonPlayerIndex, setActiveComparisonPlayerIndex] = useState<number>(0);

    const onPlayerPieEnter = (_: any, index: number) => {
        setActivePlayerIndex(index);
    };

    const onComparisonPlayerPieEnter = (_: any, index: number) => {
        setActiveComparisonPlayerIndex(index);
    };

    const playerWinDrawLoss = [
        {name: "Win", value: wins, colour: "green"},
        {name: "Draw", value: draws, colour: "yellow"},
        {name: "Loss", value: losses, colour: "red"},
    ];

    const comparisonPlayerWinDrawLoss = [
        {name: "Win", value: comparisonWins, colour: "green"},
        {name: "Draw", value: comparisonDraws, colour: "yellow"},
        {name: "Loss", value: comparisonLosses, colour: "red"},
    ]

    return (
        <div style={{maxWidth: '1100px'}}>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: '600',
                marginTop: '5px',
            }}>
                Win percentage
            </div>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '1100px'}}>
                <PieChart width={550} height={350}>
                    {comparisonPlayerName.length > 0 &&
                        <text x={550 / 2} y={25} fill="black" textAnchor="middle" dominantBaseline="central">
                            <tspan fontSize="14">{playerName}</tspan>
                        </text>
                    }
                    <Pie
                        activeIndex={activePlayerIndex}
                        activeShape={renderActiveShape}
                        data={playerWinDrawLoss}
                        cx="50%"
                        cy="50%"
                        paddingAngle={4}
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onPlayerPieEnter}
                    >
                        {playerWinDrawLoss.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.colour}/>
                        ))}
                    </Pie>
                </PieChart>
                {comparisonPlayerName.length > 0 &&
                    <PieChart width={550} height={350}>
                        <text x={550 / 2} y={25} fill="black" textAnchor="middle" dominantBaseline="central">
                            <tspan fontSize="14">{comparisonPlayerName}</tspan>
                        </text>
                        <Pie
                            activeIndex={activeComparisonPlayerIndex}
                            activeShape={renderActiveShape}
                            data={comparisonPlayerWinDrawLoss}
                            cx="50%"
                            cy="50%"
                            paddingAngle={4}
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            onMouseEnter={onComparisonPlayerPieEnter}
                        >
                            {comparisonPlayerWinDrawLoss.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.colour}/>
                            ))}
                        </Pie>
                    </PieChart>}
            </div>

        </div>
    )
}

export default PlayerWinPercentageChart;