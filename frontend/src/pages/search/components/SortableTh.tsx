import React from "react";
import baseStyles from './SearchBaseTable.module.css';
import { nextSortForColumn, SORT_ARROWS, SORT_DIRECTIONS } from "../lib/columnSort";
import { SortOptions } from "../../../types/SearchOptions";

interface SortableThProps {
    label: string;
    columnSort: SortOptions;
    activeSort: SortOptions;
    onSort: (sort: SortOptions) => void;
    className?: string;
}

/**
 * Clickable table header that navigates to the new sort via the URL.
 * The Goals header also covers Goals+Assists (second click toggles),
 * since there is no G+A column — the arrow stays on Goals for both.
 */
export const SortableTh: React.FC<SortableThProps> = ({
    label,
    columnSort,
    activeSort,
    onSort,
    className,
}) => {
    const isActive =
        activeSort === columnSort ||
        (columnSort === SortOptions.GOALS && activeSort === SortOptions.GOALS_AND_ASSISTS);

    const handleClick = () => {
        const next = nextSortForColumn(activeSort, columnSort);
        if (next !== activeSort) {
            onSort(next);
        }
    };

    const hint =
        columnSort === SortOptions.GOALS
            ? activeSort === SortOptions.GOALS
                ? 'Sorted by goals — select to sort by goals and assists'
                : activeSort === SortOptions.GOALS_AND_ASSISTS
                    ? 'Sorted by goals and assists — select to sort by goals'
                    : 'Sort by goals (select again for goals and assists)'
            : `Sort by ${label.toLowerCase()}`;

    return (
        <th
            className={className}
            aria-sort={
                isActive
                    ? SORT_DIRECTIONS[activeSort] === 'asc'
                        ? 'ascending'
                        : 'descending'
                    : 'none'
            }
        >
            <button
                type="button"
                className={`${baseStyles['sort-button']} ${isActive ? baseStyles['sort-button-active'] : ''}`}
                onClick={handleClick}
                title={hint}
                aria-label={hint}
            >
                {label}
                {isActive && (
                    <span className={baseStyles['sort-arrow']} aria-hidden="true">
                        {SORT_ARROWS[SORT_DIRECTIONS[activeSort]]}
                    </span>
                )}
            </button>
        </th>
    );
};
