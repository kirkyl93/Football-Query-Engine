import React from "react";
import {BarShapeProps, Rectangle} from "recharts";
import {getColour} from "../../../../lib/ColourUtils";
import {PlayerAppearance} from "../../../../types/Player";
import {getBarOutlineColour} from "../../lib/barOutlineColour";

interface AppearanceBarShapeOptions {
    zoomedData: PlayerAppearance[];
    showCleanSheets: boolean;
    barChartOpacity: number;
    strokeWidth: number;
}

export const createAppearanceBarShape = ({
    zoomedData,
    showCleanSheets,
    barChartOpacity,
    strokeWidth,
}: AppearanceBarShapeOptions) => (props: BarShapeProps) => {
    const entry = zoomedData[props.index];

    const cleanSheet =
        showCleanSheets &&
        (entry.club_id === entry.home_club_id
            ? entry.away_club_goals === 0
            : entry.home_club_goals === 0);
    const adjustedOpacity = cleanSheet ? barChartOpacity + 0.35 : barChartOpacity;

    return (
        <Rectangle
            x={props.x}
            y={props.y}
            width={props.width}
            height={props.height}
            fill={getColour(entry.club_id)}
            fillOpacity={adjustedOpacity}
            stroke={getBarOutlineColour(entry)}
            strokeWidth={strokeWidth}
        />
    );
};
