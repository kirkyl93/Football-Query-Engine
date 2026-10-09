import React from "react";

interface ClubBadgesCellProps {
    clubIds: (number | string)[];
    cellClassName?: string;
}

/** Shared club-badge strip cell used by all search tables. */
export const ClubBadgesCell: React.FC<ClubBadgesCellProps> = ({clubIds, cellClassName}) => (
    <td className={cellClassName}>
        {clubIds.map(clubId => {
            const trimmedClubId = typeof clubId === 'string' ? clubId.trim() : clubId;
            return (
                <img
                    key={trimmedClubId}
                    src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(trimmedClubId)}.png`}
                    alt={`Club ${trimmedClubId}`}
                    width="20px"
                    style={{marginRight: '5px'}}
                />
            );
        })}
    </td>
);
