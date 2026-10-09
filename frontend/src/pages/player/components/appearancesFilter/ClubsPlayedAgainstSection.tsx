import React from "react";
import FilterSection from "../../../../components/FilterSection";

interface ClubsPlayedAgainstSectionProps {
    selectedClubIds: number[];
    query: string;
    suggestions: [number, string][];
    isDropdownVisible: boolean;
    onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSuggestionClick: (clubId: number) => void;
    onRemoveClub: (clubId: number) => void;
}

const ClubsPlayedAgainstSection: React.FC<ClubsPlayedAgainstSectionProps> = ({
    selectedClubIds,
    query,
    suggestions,
    isDropdownVisible,
    onQueryChange,
    onSuggestionClick,
    onRemoveClub,
}) => {
    return (
        <FilterSection title="CLUBS PLAYED AGAINST">
            <div className="player-name-and-club-dropdown-content">
                <input
                    type="text"
                    placeholder="Clubs played against"
                    value={query}
                    onChange={onQueryChange}
                />
                {isDropdownVisible && suggestions.length > 0 && (
                    <ul className="suggestions-dropdown">
                        {suggestions.map((suggestion, index) => (
                            <li key={index}
                                className="suggestion-item"
                                onClick={() => onSuggestionClick(suggestion[0])}
                            >
                                <img
                                    style={{width: 30, fontSize: 15}}
                                    alt="Badge of football team selected"
                                    src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(suggestion[0])}.png`}
                                />
                                {suggestion[1]}
                            </li>
                        ))}
                    </ul>
                )}
                <div className="club-names-list">
                    {(selectedClubIds || []).map((club, index) => (
                        <span key={index} className="club-name-item">
                            <img
                                style={{width: 30}}
                                alt="Badge of football team selected"
                                src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(club)}.png`}
                            />
                            <button onClick={() => onRemoveClub(club)}>x</button>
                        </span>
                    ))}
                </div>
            </div>
        </FilterSection>
    );
};

export default ClubsPlayedAgainstSection;
