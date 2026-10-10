import {BarShapeProps} from "recharts";
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

/**
 * Strokes thinner than this are invisible but still cost paint time across
 * hundreds of bars, so they are omitted (see AppearancesMainChart).
 */
export const BAR_STROKE_CUTOFF = 0.4;

export const createAppearanceBarShape = ({
    zoomedData,
    barFills,
    showCleanSheets,
    barChartOpacity,
    strokeWidth,
}: AppearanceBarShapeOptions) => (props: BarShapeProps) => {
    const index = typeof props.index === "number" ? props.index : -1;
    const entry = index >= 0 ? zoomedData[index] : undefined;

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
    const showStroke = strokeWidth >= BAR_STROKE_CUTOFF;

    // Plain <rect>: Recharts' <Rectangle> renders the same box through an
    // extra component layer per bar (x600 bars = x600 extra renders).
    return (
        <rect
            x={props.x}
            y={props.y}
            width={props.width}
            height={props.height}
            fill={barFills[index] ?? getClubPrimary(entry.club_id)}
            fillOpacity={adjustedOpacity}
            stroke={showStroke ? getBarOutlineColour(entry) : "none"}
            strokeWidth={showStroke ? strokeWidth : 0}
        />
    );
};
