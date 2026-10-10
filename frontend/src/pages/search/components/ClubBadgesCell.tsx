import React from "react";
import {getClubName} from "../../../lib/ClubDirectory";
import shared from "../../../styles/shared.module.css";

interface ClubBadgesCellProps {
    clubIds: (number | string)[];
    cellClassName?: string;
}

/** Shared club-badge strip cell used by all search tables. */
export const ClubBadgesCell: React.FC<ClubBadgesCellProps> = ({clubIds, cellClassName}) => (
    <td className={cellClassName}>
        {clubIds.map(clubId => {
            const trimmedClubId = typeof clubId === 'string' ? clubId.trim() : clubId;
            const clubName = getClubName(trimmedClubId);
            return (
                <img
                    key={trimmedClubId}
                    src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(trimmedClubId)}.png`}
                    alt={clubName}
                    title={clubName}
                    className={shared['club-badge']}
                    style={{marginRight: '5px'}}
                />
            );
        })}
    </td>
);
