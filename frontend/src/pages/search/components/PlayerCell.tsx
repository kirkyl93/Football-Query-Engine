import React from "react";
import {Link} from "react-router-dom";
import baseStyles from './SearchBaseTable.module.css';

export function CountryFlag({code, name = code, className}: {code: string; name?: string; className?: string}) {
    return <img
        className={className ? baseStyles['flag-sm'] + ' ' + className : baseStyles['flag-sm']}
        src={'https://flagicons.lipis.dev/flags/4x3/' + code + '.svg'}
        alt={name}
        title={name}
        width={21}
        height={15}
        loading="lazy"
        decoding="async"
    />;
}

interface PlayerCellProps {
    playerId?: number;
    playerName?: string;
    countryCode?: string;
    imageUrl?: string;
    flagClassName?: string;
    flag?: React.ReactNode;
    avatarClassName?: string;
}

/** Shared flag + avatar + player-link cell used by all search tables. */
export const PlayerCell: React.FC<PlayerCellProps> = ({
    playerId,
    playerName,
    countryCode,
    imageUrl,
    flagClassName,
    flag,
    avatarClassName,
}) => playerId == null || !playerName ? (
    <>{flag}<span aria-label="Hidden player">?</span></>
) : (
    <span style={{display: 'inline-flex', alignItems: 'center'}}>
        {flag ?? (countryCode && <CountryFlag code={countryCode} className={flagClassName}/>)}
        {/*<img*/}
        {/*    className={`${baseStyles['avatar-sm']} ${avatarClassName ?? ''}`}*/}
        {/*    src={imageUrl}*/}
        {/*    alt={playerName}*/}
        {/*    width="50"*/}
        {/*/>*/}
        <Link
            to={`/player/${playerId}`}
            className={baseStyles['table-link']}
        >
            {playerName}
        </Link>
    </span>
);
