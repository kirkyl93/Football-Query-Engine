import React from "react";
import {positions} from "../../lib/searchFilterOptions";
import FilterSection from "../../../../components/FilterSection";
import {positionSummary} from "../../lib/filterSummaries";
import shared from '../../../../styles/shared.module.css';
import filterStyles from '../SearchFilterBar.module.css';

interface PositionFilterSectionProps {
    selectedPositions: string[];
    onPositionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PositionFilterSection: React.FC<PositionFilterSectionProps> = ({selectedPositions, onPositionChange}) => {
    return (
        <FilterSection title="POSITIONS" summary={positionSummary(selectedPositions)}>
            <div className={filterStyles['position-group']}>
                {positions.map(position => (
                    <label className={shared['position-checkbox-label']} key={position}>
                        <input
                            type="checkbox"
                            value={position}
                            checked={selectedPositions.includes(position)}
                            onChange={onPositionChange}
                            className={shared['position-checkbox-input']}
                        />
                        {position}
                    </label>
                ))}
            </div>
        </FilterSection>
    );
};

export default PositionFilterSection;
