import React from "react";
import {
    gameOnlySortOptions,
    minuteBasedSortOptions,
    numberOfGamesOrSeasonsSortOptions,
    overallOnlySortOptions,
    SortOptions,
    StatScope,
} from "../../../../types/SearchOptions";
import {SearchFilterState} from "../../../../types/SearchFilterState";
import {
    appearances,
    game_goals_or_assists,
    season_goals_or_assists,
    sortTypes,
    statScopes,
} from "../../lib/searchFilterOptions";
import FilterSection from "../../../../components/FilterSection";
import shared from '../../../../styles/shared.module.css';
import filterStyles from '../SearchFilterBar.module.css';

interface SortByFilterSectionProps {
    filterState: SearchFilterState;
    onStatScopeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSortByChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onMinimumAppearanceChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onMinimumGoalsChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onMaximumGoalsChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onMinimumAssistsChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onMaximumAssistsChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onMinimumGoalsAndAssistsChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onMaximumGoalsAndAssistsChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const SortByFilterSection: React.FC<SortByFilterSectionProps> = ({
    filterState,
    onStatScopeChange,
    onSortByChange,
    onMinimumAppearanceChange,
    onMinimumGoalsChange,
    onMaximumGoalsChange,
    onMinimumAssistsChange,
    onMaximumAssistsChange,
    onMinimumGoalsAndAssistsChange,
    onMaximumGoalsAndAssistsChange,
}) => {
    const goalOptions = filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH
        ? game_goals_or_assists
        : season_goals_or_assists;

    return (
        <FilterSection title="SORT BY">
            <div className={shared['radio-group']}>
                {statScopes.map(score => (
                    <label key={score.id}>
                        <input
                            type="radio"
                            value={score.id}
                            checked={filterState.statScope === score.id}
                            onChange={onStatScopeChange}
                        />
                        {score.name}
                    </label>
                ))}
            </div>
            <div className={shared['radio-group-vertical']}>
                {sortTypes
                    .filter(sort => filterState.statScope === StatScope.OVERALL ||
                        (filterState.statScope === StatScope.SEASON && !overallOnlySortOptions.includes(sort.id)) || gameOnlySortOptions.includes(sort.id))
                    .map(sort => (
                        <label key={sort.id}>
                            <input
                                type="radio"
                                value={sort.id}
                                checked={filterState.sortBy === sort.id}
                                onChange={onSortByChange}
                            />
                            {sort.name}
                        </label>
                    ))}
            </div>

            {minuteBasedSortOptions.includes(filterState.sortBy as SortOptions) && (
                <div className={shared['minute-and-age-and-sub-dropdown-group']}>
                    <label>Minimum Appearances: </label>
                    <select value={filterState.minimumAppearances ?? ''}
                            onChange={onMinimumAppearanceChange}>
                        <option value="">Any</option>
                        {appearances.map(appearance => (
                            <option key={appearance} value={appearance}>{appearance}</option>
                        ))}
                    </select>
                </div>
            )}

            {numberOfGamesOrSeasonsSortOptions.includes(filterState.sortBy as SortOptions) && (
                <>
                    <div className={filterStyles['games_or_seasons-dropdown-group']}>
                        <label>Minimum Goals: </label>
                        <select value={filterState.minimumGoals ?? ''}
                                onChange={onMinimumGoalsChange}>
                            <option value="">Any</option>
                            {goalOptions.map(goal => (
                                <option key={goal} value={goal}>{goal}</option>))}
                        </select>
                    </div>
                    <div className={filterStyles['games_or_seasons-dropdown-group']}>
                        <label>Maximum Goals: </label>
                        <select value={filterState.maximumGoals ?? ''}
                                onChange={onMaximumGoalsChange}>
                            <option value="">Any</option>
                            {goalOptions.map(goal => (
                                <option key={goal} value={goal}>{goal}</option>))}
                        </select>
                    </div>
                    <div className={filterStyles['games_or_seasons-dropdown-group']}>
                        <label>Minimum Assists: </label>
                        <select value={filterState.minimumAssists ?? ''}
                                onChange={onMinimumAssistsChange}>
                            <option value="">Any</option>
                            {goalOptions.map(goal => (
                                <option key={goal} value={goal}>{goal}</option>))}
                        </select>
                    </div>

                    <div className={filterStyles['games_or_seasons-dropdown-group']}>
                        <label>Maximum Assists: </label>
                        <select value={filterState.maximumAssists ?? ''}
                                onChange={onMaximumAssistsChange}>
                            <option value="">Any</option>
                            {goalOptions.map(goal => (
                                <option key={goal} value={goal}>{goal}</option>))}
                        </select>
                    </div>

                    <div className={filterStyles['games_or_seasons-dropdown-group']}>
                        <label>Minimum Goals and Assists: </label>
                        <select value={filterState.minimumGoalsAndAssists ?? ''}
                                onChange={onMinimumGoalsAndAssistsChange}>
                            <option value="">Any</option>
                            {goalOptions.map(goal_or_assists => (
                                <option key={goal_or_assists} value={goal_or_assists}>{goal_or_assists}</option>))}
                        </select>
                    </div>

                    <div className={filterStyles['games_or_seasons-dropdown-group']}>
                        <label>Maximum Goals and Assists: </label>
                        <select value={filterState.maximumGoalsAndAssists ?? ''}
                                onChange={onMaximumGoalsAndAssistsChange}>
                            <option value="">Any</option>
                            {goalOptions.map(goal_or_assists => (
                                <option key={goal_or_assists} value={goal_or_assists}>{goal_or_assists}</option>))}
                        </select>
                    </div>
                </>
            )}
        </FilterSection>
    );
};

export default SortByFilterSection;
