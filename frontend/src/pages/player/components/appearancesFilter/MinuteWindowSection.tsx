import {useId} from 'react';
import FilterSection from '../../../../components/FilterSection';
import shared from '../../../../styles/shared.module.css';
import {minutesPlayed} from '../../lib/appearancesFilterOptions';
import {minuteWindow} from '../../lib/appearanceMinuteWindow';
import {parseOptionalNumber} from '../../../../lib/filterStateUtils';

interface Props {
    from?: number;
    to?: number;
    onFromChange: (minute: number | undefined) => void;
    onToChange: (minute: number | undefined) => void;
}

export default function MinuteWindowSection({from, to, onFromChange, onToChange}: Props) {
    const id = useId();
    const [lower, upper] = minuteWindow(from, to);
    return <FilterSection title="MINUTE WINDOW" summary={from === undefined && to === undefined ? '' : `${lower}–${upper}'`}>
        <div className={shared['minute-and-age-and-sub-dropdown-group']}>
            <label htmlFor={id + '-from'}>From minute:</label>
            <select id={id + '-from'} value={from ?? ''} onChange={e => onFromChange(parseOptionalNumber(e.target.value))}>
                <option value="">Any</option>
                {minutesPlayed.map(minute => <option key={minute} value={minute}>{minute}</option>)}
            </select>
            <label htmlFor={id + '-to'}>To minute:</label>
            <select id={id + '-to'} value={to ?? ''} onChange={e => onToChange(parseOptionalNumber(e.target.value))}>
                <option value="">Any</option>
                {minutesPlayed.map(minute => <option key={minute} value={minute}>{minute}</option>)}
            </select>
        </div>
    </FilterSection>;
}
