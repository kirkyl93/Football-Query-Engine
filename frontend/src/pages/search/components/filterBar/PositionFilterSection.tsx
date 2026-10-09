import React from "react";
import {positions} from "../../lib/searchFilterOptions";
import FilterSection from "../../../../components/FilterSection";

interface PositionFilterSectionProps {
    selectedPositions: string[];
    onPositionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PositionFilterSection: React.FC<PositionFilterSectionProps> = ({selectedPositions, onPositionChange}) => {
    return (
        <FilterSection title="POSITIONS">
            <div className="position-group">
                {positions.map(position => (
                    <label className="position-checkbox-label" key={position}>
                        <input
                            type="checkbox"
                            value={position}
                            checked={selectedPositions.includes(position)}
                            onChange={onPositionChange}
                            className="position-checkbox-input"
                        />
                        {position}
                    </label>
                ))}
            </div>
        </FilterSection>
    );
};

export default PositionFilterSection;
