import React from "react";
import {formatSeason} from "../../../../lib/DateUtils";
import FilterSection from "../../../../components/FilterSection";
import shared from '../../../../styles/shared.module.css';

interface PlayerSeasonSectionProps {
    seasons: number[];
    selectedSeasons: number[];
    onSeasonChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PlayerSeasonSection: React.FC<PlayerSeasonSectionProps> = ({seasons, selectedSeasons, onSeasonChange}) => {
    return (
        <FilterSection title="SEASONS">
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

export default PlayerSeasonSection;
