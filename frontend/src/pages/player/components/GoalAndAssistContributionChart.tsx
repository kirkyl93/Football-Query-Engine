import React, {useState} from "react";
import {Pie, PieChart, Cell} from "recharts";
import {renderActiveShape} from "../../../lib/PieChartUtils";


interface GoalAndAssistContributionProps {
    playerName: string;
    nonPenaltyGoals: number;
    penaltyGoals: number;
    assists: number;
    totalTeamGoals: number;
    comparisonPlayerName: string;
    comparisonNonPenaltyGoals: number;
    comparisonPenaltyGoals: number;
    comparisonAssists: number;
    comparisonTotalTeamGoals: number;
}

const GoalAndAssistContributionChart: React.FC<GoalAndAssistContributionProps> = (
    {
        playerName, nonPenaltyGoals, penaltyGoals, assists, totalTeamGoals, comparisonPlayerName,
        comparisonNonPenaltyGoals, comparisonPenaltyGoals, comparisonAssists, comparisonTotalTeamGoals
    }) => {

    const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
    const [activeComparisonPlayerIndex, setActiveComparisonPlayerIndex] = useState<number>(0);

    const onPlayerPieEnter = (_: any, index: number) => {
        setActivePlayerIndex(index);
    };

    const onComparisonPlayerPieEnter = (_: any, index: number) => {
        setActiveComparisonPlayerIndex(index);
    };

    const playerPercentageOfTeamGoalsContributedTo = [
        {name: "Open play", value: nonPenaltyGoals, colour: "blue"},
        {name: "Penalties", value: penaltyGoals, colour: "gold"},
        {name: "Assists", value: assists, colour: "green"},
        {
            name: "Not involved",
            value: totalTeamGoals - nonPenaltyGoals - penaltyGoals - assists,
            colour: "red"
        }
    ]

    const comparisonPlayerPercentageOfTeamGoalsContributedTo = [
        {name: "Open play", value: comparisonNonPenaltyGoals, colour: "blue"},
        {name: "Penalties", value: comparisonPenaltyGoals, colour: "gold"},
        {name: "Assists", value: comparisonAssists, colour: "green"},
        {
            name: "Not involved",
            value: comparisonTotalTeamGoals - comparisonNonPenaltyGoals - comparisonPenaltyGoals - comparisonAssists,
            colour: "red"
        }
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
                Team goals contributed to
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
                        data={playerPercentageOfTeamGoalsContributedTo}
                        cx="50%"
                        cy="50%"
                        paddingAngle={4}
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onPlayerPieEnter}
                    >
                        {playerPercentageOfTeamGoalsContributedTo.map((entry, index) => (
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
                            data={comparisonPlayerPercentageOfTeamGoalsContributedTo}
                            cx="50%"
                            cy="50%"
                            paddingAngle={4}
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            onMouseEnter={onComparisonPlayerPieEnter}
                        >
                            {comparisonPlayerPercentageOfTeamGoalsContributedTo.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.colour}/>
                            ))}
                        </Pie>
                    </PieChart>}
            </div>

        </div>
    )
}

export default GoalAndAssistContributionChart;