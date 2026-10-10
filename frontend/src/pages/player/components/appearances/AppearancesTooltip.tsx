import React, {useMemo} from "react";
import {convertDateStringToDate, dateFormatter, formatSeason} from "../../../../lib/DateUtils";
import {getClubName, getClubPrimary} from "../../../../lib/ClubDirectory";
import {PlayerAppearance} from "../../../../types/Player";
import styles from './AppearancesTooltip.module.css';

interface AppearancesTooltipProps {
    active?: boolean;
    payload?: { payload: any }[];
    filteredData: PlayerAppearance[];
    /** Resolved bar fills keyed by game_number, so the swatch matches the bar. */
    barFillsByGame?: Map<number, string>;
    /** Appearances keyed by game_number for O(1) hover lookup. */
    filteredByGame?: Map<number, PlayerAppearance>;
}

const AppearancesTooltip: React.FC<AppearancesTooltipProps> = ({active, payload, filteredData, barFillsByGame, filteredByGame}) => {
    const gameNumber = active && payload?.length ? payload[0].payload?.game_number : undefined;

    const appearance = useMemo(() => {
        if (typeof gameNumber !== "number") {
            return undefined;
        }
        // Preferred: O(1) map lookup that stays correct when filters leave
        // non-contiguous game numbers (index math breaks there).
        const mapped = filteredByGame?.get(gameNumber);
        if (mapped) {
            return mapped;
        }
        // Legacy fallback: game numbers are 1-based and contiguous when
        // unfiltered. Guard the bounds so a filtered gap renders nothing
        // instead of crashing on undefined.
        const byIndex = filteredData[gameNumber - 1];
        if (byIndex && byIndex.game_number === gameNumber) {
            return byIndex;
        }
        // Last resort: the bar datum itself already carries the appearance.
        const raw = payload?.[0]?.payload;
        if (raw && typeof raw.club_id === "number") {
            return raw as PlayerAppearance;
        }
        return undefined;
    }, [gameNumber, filteredByGame, filteredData, payload]);

    if (!active || !appearance) {
        return null;
    }

    const swatchFill = barFillsByGame?.get(appearance.game_number) ?? getClubPrimary(appearance.club_id);

    return (
        <div className={styles['custom-tooltip']}>
            <p>Season: {formatSeason(appearance.season)}</p>
            <p>Date: {dateFormatter.format(convertDateStringToDate(appearance.date))}</p>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                lineHeight: '30px'
            }}>
                <img
                    src={`https://tmssl.akamaized.net/images/wappen/head/${appearance.home_club_id}.png`}
                    alt={appearance.home_club_name}
                    style={{width: '30px', verticalAlign: 'middle'}}
                    title={appearance.home_club_name}
                />
                <span
                    style={{lineHeight: '30px'}}>{appearance.home_club_goals} - {appearance.away_club_goals}</span>
                <img
                    src={`https://tmssl.akamaized.net/images/wappen/head/${appearance.away_club_id}.png`}
                    alt={appearance.away_club_name}
                    style={{width: '30px', verticalAlign: 'middle'}}
                    title={appearance.away_club_name}
                />
            </div>

            <p style={{fontWeight: "bold"}}>{`${appearance.competition_name}`}</p>
            <p style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                <span
                    title={getClubName(appearance.club_id)}
                    style={{
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        border: '1px solid rgba(0,0,0,0.4)',
                        background: swatchFill,
                    }}
                />
                {getClubName(appearance.club_id)}
            </p>
            <p>Minutes: {appearance.minutes_played[1] - appearance.minutes_played[0]}</p>
            <p>Goals: {appearance.goals}</p>
            <p>Own goals: {appearance.own_goal_minutes.length}</p>
            <p>Assists: {appearance.assists}</p>
            <p>Yellows: {appearance.yellow_cards}</p>
            <p>Reds: {appearance.red_cards}</p>
        </div>
    );
};

/**
 * Recharts clones tooltip content with a fresh payload wrapper on every
 * mousemove — even for moves inside the same bar. Skipping commits whose
 * game number (and data identity) is unchanged avoids re-running date
 * formatting and club lookups at mousemove frequency on large charts.
 */
const areTooltipPropsEqual = (prev: AppearancesTooltipProps, next: AppearancesTooltipProps): boolean => {
    if (prev.active !== next.active) {
        return false;
    }
    if (!next.active) {
        return prev.filteredData === next.filteredData
            && prev.barFillsByGame === next.barFillsByGame
            && prev.filteredByGame === next.filteredByGame;
    }
    const prevGame = prev.payload?.[0]?.payload?.game_number;
    const nextGame = next.payload?.[0]?.payload?.game_number;
    return prevGame === nextGame
        && prev.filteredData === next.filteredData
        && prev.barFillsByGame === next.barFillsByGame
        && prev.filteredByGame === next.filteredByGame;
};

export default React.memo(AppearancesTooltip, areTooltipPropsEqual);
