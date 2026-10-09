import React from "react";
import {minutes} from "../../lib/searchFilterOptions";
import FilterSection from "./FilterSection";

interface SubstitutesFilterSectionProps {
    subsOnly: boolean;
    earliestSubOnTime?: number;
    latestSubOnTime?: number;
    onSubsOnlyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onEarliestSubOnTimeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onLatestSubOnTimeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const SubstitutesFilterSection: React.FC<SubstitutesFilterSectionProps> = ({
    subsOnly,
    earliestSubOnTime,
    latestSubOnTime,
    onSubsOnlyChange,
    onEarliestSubOnTimeChange,
    onLatestSubOnTimeChange,
}) => {
    return (
        <FilterSection title="SUBSTITUTES">
            <div className="checkbox-group">
                <label key="subsOnly">
                    <input
                        type="checkbox"
                        value={"subsOnly"}
                        checked={subsOnly}
                        onChange={onSubsOnlyChange}
                    />
                    Substitutes only?
                </label>
            </div>
            {subsOnly && (
                <div className="minute-and-age-and-sub-dropdown-group">
                    <label>Earliest minute:</label>
                    <select value={earliestSubOnTime ?? ''}
                            onChange={onEarliestSubOnTimeChange}>
                        <option value="">Any</option>
                        {minutes.map(minute => (
                            <option key={minute} value={minute}>{minute}</option>
                        ))}
                    </select>


                    <label>Latest minute:</label>
                    <select value={latestSubOnTime ?? ''}
                            onChange={onLatestSubOnTimeChange}>
                        <option value="">Any</option>
                        {minutes.map(minute => (
                            <option key={minute} value={minute}>{minute}</option>
                        ))}
                    </select>
                </div>
            )}
        </FilterSection>
    );
};

export default SubstitutesFilterSection;
