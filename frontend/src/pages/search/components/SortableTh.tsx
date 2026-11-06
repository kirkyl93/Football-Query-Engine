import React from "react";
import baseStyles from './SearchBaseTable.module.css';
import {SORT_ARROWS, SORT_DIRECTIONS} from "../lib/columnSort";
import {SortOptions} from "../../../types/SearchOptions";

interface SortableThProps {
    label: string;
    columnSort: SortOptions;
    activeSort: SortOptions;
    direction?: 'asc' | 'desc';
    allowReverse?: boolean;
    onSort: (sort: SortOptions) => void;
    className?: string;
}

/** Click the selected metric again to reverse it, except in individual-game scope. */
export const SortableTh: React.FC<SortableThProps> = ({
    label, columnSort, activeSort, direction, allowReverse = true, onSort, className,
}) => {
    const isActive = activeSort === columnSort;
    const order = allowReverse ? direction ?? SORT_DIRECTIONS[columnSort] : 'desc';
    const currentOrder = order === 'asc' ? 'fewest first' : 'most first';
    const nextOrder = order === 'asc' ? 'most first' : 'fewest first';
    const hint = isActive
        ? 'Sorted by ' + label.toLowerCase() + ', ' + currentOrder + (allowReverse ? '. Click to show ' + nextOrder + '.' : '.')
        : 'Sort by ' + label.toLowerCase();

    return <th className={`${baseStyles.numeric} ${className ?? ''}`} aria-sort={isActive ? order === 'asc' ? 'ascending' : 'descending' : 'none'}>
        <button type="button" className={`${baseStyles['sort-button']} ${isActive ? baseStyles['sort-button-active'] : ''}`}
            onClick={() => { if (!isActive || allowReverse) onSort(columnSort); }} title={hint} aria-label={hint}>
            {label}{isActive && <span className={baseStyles['sort-arrow']} aria-hidden="true">{SORT_ARROWS[order]}</span>}
        </button>
    </th>;
};
