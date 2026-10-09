import React from "react";
import shared from "../styles/shared.module.css";

interface TitleClubBadgesProps {
    label: string;
    clubIds: number[];
}

/**
 * Shared club-badge strip for page titles (search + player appearances).
 * Shows badges inline, collapsing to a count above 10 clubs.
 */
const TitleClubBadges: React.FC<TitleClubBadgesProps> = ({label, clubIds}) => {
    if (clubIds.length === 0) {
        return null;
    }

    return (
        <>
            <span>{label}</span>
            {clubIds.length > 10 ? (
                <span style={{marginLeft: '5px'}}>{clubIds.length} CLUBS SELECTED</span>
            ) : (
                clubIds.map(clubId => (
                                <img
                                        className={shared['title-badge']}
                        key={clubId}
                        src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(clubId)}.png`}
                        alt={`Club ${clubId}`}
                    />
                )))}
        </>
    );
};

export default TitleClubBadges;
