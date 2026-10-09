import React from "react";
import {formatSeason} from "../../../../lib/DateUtils";
import FilterSection from "../../../../components/FilterSection";

interface PlayerSeasonSectionProps {
    seasons: number[];
    selectedSeasons: number[];
    onSeasonChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PlayerSeasonSection: React.FC<PlayerSeasonSectionProps> = ({seasons, selectedSeasons, onSeasonChange}) => {
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

export default PlayerSeasonSection;
