import {
    Sector,
    type PieSectorShapeProps
} from "recharts";

// Recharts types payload/percent/value at runtime (see computePieSectors)
// but does not declare them, so they are added here.
type ActiveSectorProps = PieSectorShapeProps & {
    payload?: { name?: string };
    percent?: number;
    value?: number | string;
};

export const renderActiveShape = (props: ActiveSectorProps) => {
    const RADIAN = Math.PI / 180;
    const {
        cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0,
        startAngle = 0, endAngle = 0, fill = "#8884d8", payload, percent = 0, value = 0,
    } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
        <g>
            <text x={cx} y={cy} dy={8} textAnchor="middle" fill={"black"}>
                {payload?.name}
            </text>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                startAngle={startAngle}
                endAngle={endAngle}
                stroke="black"
                strokeWidth={2.5}
                fill={fill}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 6}
                outerRadius={outerRadius + 10}
                stroke="black"
                strokeWidth={1}
                fill={fill}
            />
            <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none"/>
            <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none"/>
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${value}`}</text>
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
                {`(Rate ${(percent * 100).toFixed(2)}%)`}
            </text>
        </g>
    );
};

export const renderPieSector = (props: PieSectorShapeProps) =>
    props.isActive ? renderActiveShape(props) : <Sector {...props} />;
