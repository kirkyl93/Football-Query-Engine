import React from "react";
import {ClubBadge} from './ClubBadge';
import baseStyles from "./SearchBaseTable.module.css";

interface ClubBadgesCellProps {
    clubIds?: (number | string)[];
    cellClassName?: string;
}

export function ClubBadges({clubIds}: {clubIds?: (number | string)[]}) {
    return (
        <span className={baseStyles['club-badges']}>
            {clubIds?.map(clubId => <ClubBadge key={String(clubId).trim()} clubId={clubId}/>) ?? '—'}
        </span>
    );
}

/** Shared club-badge strip cell used by all search tables. */
export const ClubBadgesCell: React.FC<ClubBadgesCellProps> = ({clubIds, cellClassName}) => (
    <td className={cellClassName}>
        <ClubBadges clubIds={clubIds}/>
    </td>
);
