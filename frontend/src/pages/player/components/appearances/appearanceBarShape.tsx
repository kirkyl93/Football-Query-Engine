import React from "react";
import {BarShapeProps, Rectangle} from "recharts";
import {getClubPrimary} from "../../../../lib/ClubDirectory";
import {PlayerAppearance} from "../../../../types/Player";
import {getBarOutlineColour} from "../../lib/barOutlineColour";

interface AppearanceBarShapeOptions {
    zoomedData: PlayerAppearance[];
    barFills: string[];
    showCleanSheets: boolean;
    barChartOpacity: number;
    strokeWidth: number;
}

export const createAppearanceBarShape = ({
    zoomedData,
    barFills,
    showCleanSheets,
    barChartOpacity,
    strokeWidth,
}: AppearanceBarShapeOptions) => (props: BarShapeProps) => {
    const entry = zoomedData[props.index];

    // Recharts can call the shape with a stale index while the data
    // shrinks (e.g. filters removing games). Render nothing instead of
    // throwing and unmounting the whole page.
    if (!entry) {
        return null;
    }

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
            fill={barFills[props.index] ?? getClubPrimary(entry.club_id)}
            fillOpacity={adjustedOpacity}
            stroke={getBarOutlineColour(entry)}
            strokeWidth={strokeWidth}
        />
    );
};
