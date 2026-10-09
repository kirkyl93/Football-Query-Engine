import React from "react";
import {Link} from "react-router-dom";

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
    <>
        <img
            className={flagClassName}
            src={`https://flagicons.lipis.dev/flags/4x3/${countryCode}.svg`}
            alt={`${countryCode}`}
            style={{width: '20px', height: '14px', marginRight: '10px'}}
        />
        <img
            className={avatarClassName}
            src={imageUrl}
            alt={playerName}
            width="50"
            style={{marginRight: '10px', borderRadius: '50%'}}
        />
        <Link
            to={`/player/${playerId}`}
            style={{textDecoration: 'none', color: 'inherit'}}
        >
            {playerName}
        </Link>
    </>
);
