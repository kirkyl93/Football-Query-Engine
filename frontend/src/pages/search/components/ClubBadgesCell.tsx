import React from "react";
import {getClubName} from "../../../lib/ClubDirectory";
import shared from "../../../styles/shared.module.css";
import baseStyles from "./SearchBaseTable.module.css";

interface ClubBadgesCellProps {
    clubIds: (number | string)[];
    cellClassName?: string;
}

/** Shared club-badge strip cell used by all search tables. */
export const ClubBadgesCell: React.FC<ClubBadgesCellProps> = ({clubIds, cellClassName}) => (
    <td className={cellClassName}>
        <div className={baseStyles['club-badges']}>
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
                        width={38}
                        height={38}
                        loading="lazy"
                        decoding="async"
                    />
                );
            })}
        </div>
    </td>
);
