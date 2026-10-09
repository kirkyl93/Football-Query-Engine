import React from "react";
import {AppearanceTypeOptions} from "../../../../types/SearchOptions";
import {appearanceTypeOptions, minutesPlayed} from "../../lib/appearancesFilterOptions";
import FilterSection from "../../../../components/FilterSection";

interface AppearanceTypeSectionProps {
    selectedAppearanceType: AppearanceTypeOptions;
    minimumMinutesPlayed?: number;
    maximumMinutesPlayed?: number;
    onAppearanceTypeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onMinimumMinutesPlayedChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onMaximumMinutesPlayedChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const AppearanceTypeSection: React.FC<AppearanceTypeSectionProps> = ({
    selectedAppearanceType,
    minimumMinutesPlayed,
    maximumMinutesPlayed,
    onAppearanceTypeChange,
    onMinimumMinutesPlayedChange,
    onMaximumMinutesPlayedChange,
}) => {
    return (
        <FilterSection title="ONLY INCLUDE GAMES WHERE">
            <div className='checkbox-group'>
                <div className='radio-group'>
                    {appearanceTypeOptions.map(option => (
                        <label key={option.id}>
                            <input
                                type="radio"
                                value={option.id}
                                checked={selectedAppearanceType === option.id}
                                onChange={onAppearanceTypeChange}
                            />
                            {option.name}
                        </label>
                    ))}
                </div>
                <div className="minute-and-age-and-sub-dropdown-group">
                    <label>minutes played at least: </label>
                    <select value={minimumMinutesPlayed ?? ''}
                            onChange={onMinimumMinutesPlayedChange}>
                        <option value="">Any</option>
                        {minutesPlayed.map(minute => (
                            <option key={minute} value={minute}>{minute}</option>
                        ))}
                    </select>
                </div>
                <div className="minute-and-age-and-sub-dropdown-group">
                    <label>minutes played at most: </label>
                    <select value={maximumMinutesPlayed ?? ''}
                            onChange={onMaximumMinutesPlayedChange}>
                        <option value="">Any</option>
                        {minutesPlayed.map(minute => (
                            <option key={minute} value={minute}>{minute}</option>
                        ))}
                    </select>
                </div>
            </div>
        </FilterSection>
    );
};

export default AppearanceTypeSection;
