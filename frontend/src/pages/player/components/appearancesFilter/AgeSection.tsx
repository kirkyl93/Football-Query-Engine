import {useId} from 'react';
import FilterSection from '../../../../components/FilterSection';
import shared from '../../../../styles/shared.module.css';
import {minMaxSummary} from '../../../search/lib/filterSummaries';
import {ages} from '../../../search/lib/searchFilterOptions';
import {parseOptionalNumber} from '../../../../lib/filterStateUtils';

interface Props {
    minimum?: number;
    maximum?: number;
    available: boolean;
    onMinimumChange: (age: number | undefined) => void;
    onMaximumChange: (age: number | undefined) => void;
}

export default function AgeSection({minimum, maximum, available, onMinimumChange, onMaximumChange}: Props) {
    const id = useId();
    return <FilterSection title="AGE" summary={minMaxSummary(minimum, maximum, '')}>
        <div className={shared['minute-and-age-and-sub-dropdown-group']}>
            <label htmlFor={id + '-min'}>Min age:</label>
            <select id={id + '-min'} disabled={!available} value={minimum ?? ''} onChange={e => onMinimumChange(parseOptionalNumber(e.target.value))}>
                <option value="">Any</option>
                {ages.map(age => <option key={age} value={age}>{age}</option>)}
            </select>
            <label htmlFor={id + '-max'}>Max age:</label>
            <select id={id + '-max'} disabled={!available} value={maximum ?? ''} onChange={e => onMaximumChange(parseOptionalNumber(e.target.value))}>
                <option value="">Any</option>
                {ages.map(age => <option key={age} value={age}>{age}</option>)}
            </select>
        </div>
    </FilterSection>;
}
