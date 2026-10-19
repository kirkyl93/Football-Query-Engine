import React from "react";
import {getClubName} from "../lib/ClubDirectory";
import shared from "../styles/shared.module.css";

interface TitleClubBadgesProps {
    label: string;
    clubIds: number[];
}

/**
 * Shared club-badge strip for page titles (search + player appearances).
 * Owns its ", label: " separator so clause spacing is never caller-owned.
 * Collapses to a count above 10 clubs.
 */
const TitleClubBadges: React.FC<TitleClubBadgesProps> = ({label, clubIds}) => {
    if (clubIds.length === 0) {
        return null;
    }

    return (
        <>
            <span>, {label}:</span>
            {clubIds.length > 10 ? (
                <span style={{marginLeft: '5px'}}>{clubIds.length} clubs selected</span>
            ) : (
                clubIds.map(clubId => (
                                <img
                                        className={shared['title-badge']}
                        key={clubId}
                        src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(clubId)}.png`}
                        alt={getClubName(clubId)}
                        title={getClubName(clubId)}
                        width={20}
                        height={20}
                        loading="lazy"
                        decoding="async"
                    />
                )))}
        </>
    );
};

export default TitleClubBadges;
