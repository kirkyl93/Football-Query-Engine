import React from "react";
import ComparisonPieChart from "./charts/ComparisonPieChart";
import {appearanceTypeSlices} from "../lib/pieChartData";


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
    return (
        <ComparisonPieChart
            title="Appearance by type"
            playerName={playerName}
            playerSlices={appearanceTypeSlices(startedAndFinished, startedAndSubbed, subbedOnAndOff, subbedOnAndFinished)}
            comparisonPlayerName={comparisonPlayerName}
            comparisonSlices={appearanceTypeSlices(
                comparisonStartedAndFinished, comparisonStartedAndSubbed, comparisonSubbedOnAndOff, comparisonSubbedOnAndFinished,
            )}
        />
    )
}

export default SubbedOnAndOffChart;
