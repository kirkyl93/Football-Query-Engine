import React from "react";
import {convertDateStringToDate, dateFormatter, formatSeason} from "../../../../lib/DateUtils";
import {PlayerAppearance} from "../../../../types/Player";
import styles from './AppearancesTooltip.module.css';

interface AppearancesTooltipProps {
    active?: boolean;
    payload?: { payload: PlayerAppearance }[];
    filteredData: PlayerAppearance[];
}

const AppearancesTooltip: React.FC<AppearancesTooltipProps> = ({active, payload, filteredData}) => {
    if (active && payload && payload.length) {
        const gameNumber = payload[0].payload.game_number;
        const appearance = filteredData[gameNumber - 1];

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
                <p>Minutes: {appearance.minutes_played[1] - appearance.minutes_played[0]}</p>
                <p>Goals: {appearance.goals}</p>
                <p>Own goals: {appearance.own_goal_minutes.length}</p>
                <p>Assists: {appearance.assists}</p>
                <p>Yellows: {appearance.yellow_cards}</p>
                <p>Reds: {appearance.red_cards}</p>
            </div>
        );
    }

    return null;
};

export default AppearancesTooltip;
