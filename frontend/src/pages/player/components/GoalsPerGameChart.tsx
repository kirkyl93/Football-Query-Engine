import React, {useState} from "react";
import {Pie, PieChart, Cell} from "recharts";
import {renderActiveShape} from "../../../lib/PieChartUtils";


interface GoalsPerGameProps {
    playerName: string;
    goalsByGame: number[];
    comparisonPlayerName: string;
    comparisonGoalsByGame: number[];
}

const GoalsPerGameChart: React.FC<GoalsPerGameProps> = (
    {
        playerName, goalsByGame, comparisonPlayerName, comparisonGoalsByGame
    }) => {

    const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
    const [activeComparisonPlayerIndex, setActiveComparisonPlayerIndex] = useState<number>(0);

    const onPlayerPieEnter = (_: any, index: number) => {
        setActivePlayerIndex(index);
    };

    const onComparisonPlayerPieEnter = (_: any, index: number) => {
        setActiveComparisonPlayerIndex(index);
    };

    const playerGoals = [
        {name: "No goals", value: goalsByGame[0], colour: "red"},
        {name: "1 goal", value: goalsByGame[1], colour: "yellow"},
        {name: "2 goals", value: goalsByGame[2], colour: "green"},
        {name: "3+ goals", value: goalsByGame[3], colour: "gold"},
    ];

    const comparisonPlayerGoals = [
        {name: "No goals", value: comparisonGoalsByGame[0], colour: "red"},
        {name: "1 goal", value: comparisonGoalsByGame[1], colour: "yellow"},
        {name: "2 goals", value: comparisonGoalsByGame[2], colour: "green"},
        {name: "3+ goals", value: comparisonGoalsByGame[3], colour: "gold"},
    ];

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
                Goals by game
            </div>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '1100px'}}>
                <PieChart width={550} height={300}>
                    {comparisonPlayerName.length > 0 &&
                        <text x={550 / 2} y={25} fill="black" textAnchor="middle" dominantBaseline="central">
                            <tspan fontSize="14">{playerName}</tspan>
                        </text>
                    }
                    <Pie
                        activeIndex={activePlayerIndex}
                        activeShape={renderActiveShape}
                        data={playerGoals}
                        cx="50%"
                        cy="50%"
                        paddingAngle={4}
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onPlayerPieEnter}
                    >
                        {playerGoals.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.colour}/>
                        ))}
                    </Pie>
                </PieChart>
                {comparisonPlayerName.length > 0 &&
                    <PieChart width={550} height={300}>
                        <text x={550 / 2} y={25} fill="black" textAnchor="middle" dominantBaseline="central">
                            <tspan fontSize="14">{comparisonPlayerName}</tspan>
                        </text>
                        <Pie
                            activeIndex={activeComparisonPlayerIndex}
                            activeShape={renderActiveShape}
                            data={comparisonPlayerGoals}
                            cx="50%"
                            cy="50%"
                            paddingAngle={4}
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            onMouseEnter={onComparisonPlayerPieEnter}
                        >
                            {comparisonPlayerGoals.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.colour}/>
                            ))}
                        </Pie>
                    </PieChart>}
            </div>

        </div>
    )
}

export default GoalsPerGameChart;