import React, {useState} from "react";
import {Pie, PieChart, Cell} from "recharts";
import {renderActiveShape} from "../../../lib/PieChartUtils";


interface TeamGoalsConcededPerGameProps {
    playerName: string;
    teamGoalsConcededByGame: number[];
    comparisonPlayerName: string;
    comparisonTeamGoalsConcededByGame: number[];
}

const TeamGoalsConcededByGameChart: React.FC<TeamGoalsConcededPerGameProps> = (
    {
        playerName, teamGoalsConcededByGame, comparisonPlayerName, comparisonTeamGoalsConcededByGame
    }) => {

    const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
    const [activeComparisonPlayerIndex, setActiveComparisonPlayerIndex] = useState<number>(0);

    const onPlayerPieEnter = (_: any, index: number) => {
        setActivePlayerIndex(index);
    };

    const onComparisonPlayerPieEnter = (_: any, index: number) => {
        setActiveComparisonPlayerIndex(index);
    };

    const teamGoalsConceded = [
        {name: "No goals", value: teamGoalsConcededByGame[0], colour: "gold"},
        {name: "1 goal", value: teamGoalsConcededByGame[1], colour: "green"},
        {name: "2 goals", value: teamGoalsConcededByGame[2], colour: "yellow"},
        {name: "3 goals", value: teamGoalsConcededByGame[3], colour: "orange"},
        {name: "4 goals", value: teamGoalsConcededByGame[4], colour: "red"},
        {name: "5+ goals", value: teamGoalsConcededByGame[5], colour: "black"}
    ]

    const comparisonTeamGoalsConceded = [
        {name: "No goals", value: comparisonTeamGoalsConcededByGame[0], colour: "gold"},
        {name: "1 goal", value: comparisonTeamGoalsConcededByGame[1], colour: "green"},
        {name: "2 goals", value: comparisonTeamGoalsConcededByGame[2], colour: "yellow"},
        {name: "3 goals", value: comparisonTeamGoalsConcededByGame[3], colour: "orange"},
        {name: "4 goals", value: comparisonTeamGoalsConcededByGame[4], colour: "red"},
        {name: "5+ goals", value: comparisonTeamGoalsConcededByGame[5], colour: "black"}
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
                Team goals conceded by game
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
                        data={teamGoalsConceded}
                        cx="50%"
                        cy="50%"
                        paddingAngle={4}
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onPlayerPieEnter}
                    >
                        {teamGoalsConceded.map((entry, index) => (
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
                            data={comparisonTeamGoalsConceded}
                            cx="50%"
                            cy="50%"
                            paddingAngle={4}
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            onMouseEnter={onComparisonPlayerPieEnter}
                        >
                            {comparisonTeamGoalsConceded.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.colour}/>
                            ))}
                        </Pie>
                    </PieChart>}
            </div>

        </div>
    )
}

export default TeamGoalsConcededByGameChart;