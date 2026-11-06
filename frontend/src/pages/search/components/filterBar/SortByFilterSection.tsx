import React from "react";
import {SORT_ARROWS, SORT_DIRECTIONS} from "../../lib/columnSort";
import {gameOnlySortOptions, overallOnlySortOptions, SortOptions, StatScope} from "../../../../types/SearchOptions";
import {SearchFilterState} from "../../../../types/SearchFilterState";
import {appearances, game_goals_or_assists, season_goals_or_assists, sortTypes, statScopes} from "../../lib/searchFilterOptions";
import FilterSection from "../../../../components/FilterSection";
import {sortSummary} from "../../lib/filterSummaries";
import shared from '../../../../styles/shared.module.css';
import styles from '../SearchFilterBar.module.css';

type SelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => void;
interface SortByFilterSectionProps {
    filterState: SearchFilterState;
    onStatScopeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onSortSelection: (sort: SortOptions) => void;
    onMinimumAppearanceChange: SelectChange;
    onMaximumAppearanceChange: SelectChange;
    onMinimumGoalsChange: SelectChange;
    onMaximumGoalsChange: SelectChange;
    onMinimumAssistsChange: SelectChange;
    onMaximumAssistsChange: SelectChange;
    onMinimumGoalsAndAssistsChange: SelectChange;
    onMaximumGoalsAndAssistsChange: SelectChange;
    onMinimumYellowCardsChange: SelectChange;
    onMaximumYellowCardsChange: SelectChange;
    onMinimumRedCardsChange: SelectChange;
    onMaximumRedCardsChange: SelectChange;
}

const range = (last: number) => Array.from({length: last + 1}, (_, index) => index);
const careerOptions = [...range(100), ...Array.from({length: 36}, (_, index) => 125 + index * 25)];
const careerAppearances = [1, ...appearances, ...Array.from({length: 35}, (_, index) => 300 + index * 50)];

const BoundSelect = ({id, label, value, options, minimum, onChange}: {
    id: string; label: string; value?: number; options: number[]; minimum: boolean; onChange: SelectChange;
}) => {
    // Keep exact LLM/URL values selectable, including values outside the presets.
    const values = [...new Set([...options.filter(n => !minimum || n > 0), ...(value === undefined ? [] : [value])])].sort((a, b) => a - b);
    return <div className={styles['games_or_seasons-dropdown-group']}>
        <label htmlFor={id}>{label}:</label>
        <select id={id} value={value ?? ''} onChange={onChange}>
            <option value="">Any</option>
            {values.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
    </div>;
};

const SortByFilterSection: React.FC<SortByFilterSectionProps> = props => {
    const {filterState: state, onStatScopeChange, onSortSelection} = props;
    const id = React.useId();
    const game = state.statScope === StatScope.GAME;
    const gameCount = state.sortBy === SortOptions.NUMBER_OF_GAMES_WITH;
    const perSeason = state.statScope === StatScope.SEASON || state.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH;
    const direction = game ? 'desc' : state.sortDirection ?? SORT_DIRECTIONS[state.sortBy];
    const context = gameCount ? 'per game' : perSeason ? 'per season' : 'overall';
    const statOptions = gameCount ? game_goals_or_assists : perSeason ? season_goals_or_assists : careerOptions;
    const appearanceOptions = perSeason ? range(100) : [0, ...careerAppearances];
    const cardOptions = gameCount ? range(2) : perSeason ? range(40) : careerOptions;
    const bounds = [
        ...(!gameCount ? [{name: 'Appearances', min: state.minimumAppearances, max: state.maximumAppearances, options: appearanceOptions, minChange: props.onMinimumAppearanceChange, maxChange: props.onMaximumAppearanceChange}] : []),
        {name: 'Goals', min: state.minimumGoals, max: state.maximumGoals, options: statOptions, minChange: props.onMinimumGoalsChange, maxChange: props.onMaximumGoalsChange},
        {name: 'Assists', min: state.minimumAssists, max: state.maximumAssists, options: statOptions, minChange: props.onMinimumAssistsChange, maxChange: props.onMaximumAssistsChange},
        {name: 'Goals and Assists', min: state.minimumGoalsAndAssists, max: state.maximumGoalsAndAssists, options: statOptions, minChange: props.onMinimumGoalsAndAssistsChange, maxChange: props.onMaximumGoalsAndAssistsChange},
        {name: 'Yellow Cards', min: state.minimumYellowCards, max: state.maximumYellowCards, options: cardOptions, minChange: props.onMinimumYellowCardsChange, maxChange: props.onMaximumYellowCardsChange},
        {name: 'Red Cards', min: state.minimumRedCards, max: state.maximumRedCards, options: gameCount ? range(2) : perSeason ? range(10) : careerOptions, minChange: props.onMinimumRedCardsChange, maxChange: props.onMaximumRedCardsChange},
    ];

    return <FilterSection title="SORT BY" summary={sortSummary(state.sortBy, state.statScope, game ? 'desc' : state.sortDirection)}>
        <div className={shared['radio-group']}>
            {statScopes.map(scope => <label key={scope.id}>
                <input type="radio" value={scope.id} checked={state.statScope === scope.id} onChange={onStatScopeChange}/>{scope.name}
            </label>)}
        </div>
        <div className={shared['radio-group-vertical']} role="group" aria-label="Ranking statistic">
            {sortTypes.filter(sort => game ? gameOnlySortOptions.includes(sort.id) : state.statScope !== StatScope.SEASON || !overallOnlySortOptions.includes(sort.id)).map(sort => {
                const selected = state.sortBy === sort.id;
                const name = game ? 'Most ' + sort.name.toLowerCase() : sort.name;
                const order = direction === 'asc' ? 'fewest / lowest first' : 'most / highest first';
                return <button key={sort.id} type="button" className={styles.sortOption} aria-pressed={selected}
                    aria-label={name} aria-description={selected ? order + (game ? '' : '; activate again to reverse') : undefined}
                    title={selected ? name + ': ' + order + (game ? '' : '. Click to reverse.') : 'Rank by ' + name.toLowerCase()}
                    onClick={() => onSortSelection(sort.id)}>
                    {name}{selected && <span className={styles.rankingArrow} aria-hidden="true">{SORT_ARROWS[direction]}</span>}
                </button>;
            })}
        </div>
        {!game && <section aria-label="Qualification filters">
            <h4 className={styles.qualificationTitle}>Qualification filters <span>({context})</span></h4>
            {bounds.map((bound, index) => <React.Fragment key={bound.name}>
                <BoundSelect id={id + '-min-' + index} label={'Minimum ' + bound.name} value={bound.min} options={bound.options} minimum onChange={bound.minChange}/>
                <BoundSelect id={id + '-max-' + index} label={'Maximum ' + bound.name} value={bound.max} options={bound.options} minimum={false} onChange={bound.maxChange}/>
            </React.Fragment>)}
        </section>}
    </FilterSection>;
};

export default SortByFilterSection;
