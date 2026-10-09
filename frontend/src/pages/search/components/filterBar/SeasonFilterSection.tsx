import React from "react";
import {formatSeason} from "../../../../lib/DateUtils";
import {seasons} from "../../lib/searchFilterOptions";
import FilterSection from "./FilterSection";

interface SeasonFilterSectionProps {
    selectedSeasons: number[];
    onSeasonChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SeasonFilterSection: React.FC<SeasonFilterSectionProps> = ({selectedSeasons, onSeasonChange}) => {
    return (
        <FilterSection title="SEASONS">
            <div className="season-group">
                {seasons.map(season => (
                    <label className="season-checkbox-label" key={season}>
                        <input
                            type="checkbox"
                            value={season}
                            checked={selectedSeasons.includes(season)}
                            onChange={onSeasonChange}
                            className="season-checkbox-input"
                        />
                        <span>{formatSeason(season)}</span>
                    </label>
                ))}
            </div>
        </FilterSection>
    );
};

export default SeasonFilterSection;
