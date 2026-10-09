import React from "react";
import {Pie, PieChart} from "recharts";
import {renderPieSector} from "../../../../lib/PieChartUtils";
import {PieSlice} from "../../lib/pieChartData";

interface ComparisonPieChartProps {
    title: string;
    playerName: string;
    playerSlices: PieSlice[];
    comparisonPlayerName: string;
    comparisonSlices: PieSlice[];
}

/**
 * Shared single/comparison pie chart. Replaces six near-identical chart
 * components.
 */
const ComparisonPieChart: React.FC<ComparisonPieChartProps> = ({
    title,
    playerName,
    playerSlices,
    comparisonPlayerName,
    comparisonSlices,
}) => {
    // Per-slice colours travel on the datum itself (Cell is deprecated);
    // renderPieSector resolves them for both states via the shape prop.
    const renderPie = (name: string, slices: PieSlice[], showTitle: boolean) => (
        <PieChart width={550} height={350}>
            {showTitle &&
                <text x={550 / 2} y={25} fill="black" textAnchor="middle" dominantBaseline="central">
                    <tspan fontSize="14">{name}</tspan>
                </text>
            }
            <Pie
                shape={renderPieSector}
                data={slices.map(slice => ({...slice, fill: slice.colour}))}
                cx="50%"
                cy="50%"
                paddingAngle={4}
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
            />
        </PieChart>
    );

    const hasComparison = comparisonPlayerName.length > 0;

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
                {title}
            </div>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '1100px'}}>
                {renderPie(playerName, playerSlices, hasComparison)}
                {hasComparison && renderPie(comparisonPlayerName, comparisonSlices, hasComparison)}
            </div>

        </div>
    );
};

export default ComparisonPieChart;
