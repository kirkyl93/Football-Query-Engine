import React, {useState} from "react";
import {Pie, PieChart, Cell} from "recharts";
import {renderActiveShape} from "../../../lib/PieChartUtils";


interface SubbedOnAndOffProps {
    playerName: string;
    startedAndFinished: number;
    startedAndSubbed: number;
    subbedOnAndOff: number;
    subbedOnAndFinished: number;
    comparisonPlayerName: string;
    comparisonStartedAndFinished: number;
    comparisonStartedAndSubbed: number;
    comparisonSubbedOnAndOff: number;
    comparisonSubbedOnAndFinished: number;
}

const SubbedOnAndOffChart: React.FC<SubbedOnAndOffProps> = (
    {
        playerName, startedAndFinished, startedAndSubbed, subbedOnAndOff, subbedOnAndFinished, comparisonPlayerName,
        comparisonStartedAndFinished, comparisonStartedAndSubbed, comparisonSubbedOnAndOff, comparisonSubbedOnAndFinished
    }) => {

    const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
    const [activeComparisonPlayerIndex, setActiveComparisonPlayerIndex] = useState<number>(0);

    const onPlayerPieEnter = (_: any, index: number) => {
        setActivePlayerIndex(index);
    };

    const onComparisonPlayerPieEnter = (_: any, index: number) => {
        setActiveComparisonPlayerIndex(index);
    };

    const minutesPlayed = [
        {name: "Full game", value: startedAndFinished, colour: "green"},
        {name: "Subbed off", value: startedAndSubbed, colour: "yellow"},
        {name: "Subbed on", value: subbedOnAndFinished, colour: "#FFBF00"},
        {name: "On and off", value: subbedOnAndOff, colour: "red"}
    ]

    const comparisonMinutesPlayed = [
        {name: "Full game", value: comparisonStartedAndFinished, colour: "green"},
        {name: "Subbed off", value: comparisonStartedAndSubbed, colour: "yellow"},
        {name: "Subbed on", value: comparisonSubbedOnAndFinished, colour: "#FFBF00"},
        {name: "On and off", value: comparisonSubbedOnAndOff, colour: "red"}
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
                Appearance by type
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
                        data={minutesPlayed}
                        cx="50%"
                        cy="50%"
                        paddingAngle={4}
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onPlayerPieEnter}
                    >
                        {minutesPlayed.map((entry, index) => (
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
                            data={comparisonMinutesPlayed}
                            cx="50%"
                            cy="50%"
                            paddingAngle={4}
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            onMouseEnter={onComparisonPlayerPieEnter}
                        >
                            {comparisonMinutesPlayed.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.colour}/>
                            ))}
                        </Pie>
                    </PieChart>}
            </div>

        </div>
    )
}

export default SubbedOnAndOffChart;