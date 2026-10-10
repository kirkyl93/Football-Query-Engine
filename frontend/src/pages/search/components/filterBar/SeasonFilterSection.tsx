import React from "react";
import {formatSeason} from "../../../../lib/DateUtils";
import {seasons} from "../../lib/searchFilterOptions";
import FilterSection from "../../../../components/FilterSection";
import {seasonSummary} from "../../lib/filterSummaries";
import shared from '../../../../styles/shared.module.css';

interface SeasonFilterSectionProps {
    selectedSeasons: number[];
    onSeasonChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SeasonFilterSection: React.FC<SeasonFilterSectionProps> = ({selectedSeasons, onSeasonChange}) => {
    return (
        <FilterSection title="SEASONS" summary={seasonSummary(selectedSeasons)}>
            <div className={shared['season-group']}>
                {seasons.map(season => (
                    <label className={shared['season-checkbox-label']} key={season}>
                        <input
                            type="checkbox"
                            value={season}
                            checked={selectedSeasons.includes(season)}
                            onChange={onSeasonChange}
                            className={shared['season-checkbox-input']}
                        />
                        <span>{formatSeason(season)}</span>
                    </label>
                ))}
            </div>
        </FilterSection>
    );
};

export default SeasonFilterSection;
