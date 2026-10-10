import React from "react";
import {Link} from "react-router-dom";
import baseStyles from './SearchBaseTable.module.css';

interface PlayerCellProps {
    playerId: number;
    playerName: string;
    countryCode: string;
    imageUrl: string;
    flagClassName?: string;
    avatarClassName?: string;
}

/** Shared flag + avatar + player-link cell used by all search tables. */
export const PlayerCell: React.FC<PlayerCellProps> = ({
    playerId,
    playerName,
    countryCode,
    imageUrl,
    flagClassName,
    avatarClassName,
}) => (
    <span style={{display: 'inline-flex', alignItems: 'center'}}>
        <img
            className={`${baseStyles['flag-sm']} ${flagClassName ?? ''}`}
            src={`https://flagicons.lipis.dev/flags/4x3/${countryCode}.svg`}
            alt={`${countryCode}`}
        />
        <img
            className={`${baseStyles['avatar-sm']} ${avatarClassName ?? ''}`}
            src={imageUrl}
            alt={playerName}
            width="50"
        />
        <Link
            to={`/player/${playerId}`}
            className={baseStyles['table-link']}
        >
            {playerName}
        </Link>
    </span>
);
