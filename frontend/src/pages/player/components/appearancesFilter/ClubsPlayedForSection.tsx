import React from "react";
import {getColour, hexToRGB} from "../../../../lib/ColourUtils";
import FilterSection from "../../../../components/FilterSection";
import {playerClubsForSummary} from "../../lib/playerFilterSummaries";
import shared from '../../../../styles/shared.module.css';

interface ClubsPlayedForSectionProps {
    clubs: [number, string][];
    selectedClubIds: number[];
    onClubChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ClubsPlayedForSection: React.FC<ClubsPlayedForSectionProps> = ({clubs, selectedClubIds, onClubChange}) => {
    return (
        <FilterSection title="CLUBS PLAYED FOR" summary={playerClubsForSummary(selectedClubIds, clubs)}>
            <div className={shared['checkbox-group-vertical']}>
                {clubs.map(club => (
                    <label className="club-label"
                           style={{
                               backgroundColor: hexToRGB(getColour(club[0]), 0.25),
                           }}
                           key={club[0]}>
                        <input
                            type="checkbox"
                            value={club[0]}
                            checked={selectedClubIds.includes(club[0])}
                            onChange={onClubChange}
                        />
                        <img
                            style={{width: 30, fontSize: 15, marginRight: "5px"}}
                            alt="Badge of football team selected"
                            src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(club[0])}.png`}
                        />
                        {club[1]}
                    </label>
                ))}
            </div>
        </FilterSection>
    );
};

export default ClubsPlayedForSection;
