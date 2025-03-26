import React, {useState} from "react";
import {Pie, PieChart, Cell} from "recharts";
import {renderActiveShape} from "../../../lib/PieChartUtils";


interface TeamGoalsPerGameProps {
    playerName: string;
    teamGoalsByGame: number[];
    comparisonPlayerName: string;
    comparisonTeamGoalsByGame: number[];
}

const TeamGoalsByGameChart: React.FC<TeamGoalsPerGameProps> = (
    {
        playerName, teamGoalsByGame, comparisonPlayerName, comparisonTeamGoalsByGame
    }) => {

    const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
    const [activeComparisonPlayerIndex, setActiveComparisonPlayerIndex] = useState<number>(0);

    const onPlayerPieEnter = (_: any, index: number) => {
        setActivePlayerIndex(index);
    };

    const onComparisonPlayerPieEnter = (_: any, index: number) => {
        setActiveComparisonPlayerIndex(index);
    };

    const teamGoalsScored = [
        {name: "No goals", value: teamGoalsByGame[0], colour: "red"},
        {name: "1 goal", value: teamGoalsByGame[1], colour: "yellow"},
        {name: "2 goals", value: teamGoalsByGame[2], colour: "green"},
        {name: "3 goals", value: teamGoalsByGame[3], colour: "blue"},
        {name: "4 goals", value: teamGoalsByGame[4], colour: "silver"},
        {name: "5+ goals", value: teamGoalsByGame[5], colour: "gold"}
    ]

    const comparisonTeamGoalsScored = [
        {name: "No goals", value: comparisonTeamGoalsByGame[0], colour: "red"},
        {name: "1 goal", value: comparisonTeamGoalsByGame[1], colour: "yellow"},
        {name: "2 goals", value: comparisonTeamGoalsByGame[2], colour: "green"},
        {name: "3 goals", value: comparisonTeamGoalsByGame[3], colour: "blue"},
        {name: "4 goals", value: comparisonTeamGoalsByGame[4], colour: "silver"},
        {name: "5+ goals", value: comparisonTeamGoalsByGame[5], colour: "gold"}
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
                Team goals by game
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
                        data={teamGoalsScored}
                        cx="50%"
                        cy="50%"
                        paddingAngle={4}
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onPlayerPieEnter}
                    >
                        {teamGoalsScored.map((entry, index) => (
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
                            data={comparisonTeamGoalsScored}
                            cx="50%"
                            cy="50%"
                            paddingAngle={4}
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            onMouseEnter={onComparisonPlayerPieEnter}
                        >
                            {comparisonTeamGoalsScored.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.colour}/>
                            ))}
                        </Pie>
                    </PieChart>}
            </div>

        </div>
    )
}

export default TeamGoalsByGameChart;