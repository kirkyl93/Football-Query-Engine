import React from "react";
import FilterSection from "../../../../components/FilterSection";
import shared from '../../../../styles/shared.module.css';

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
            <div className={shared['player-name-and-club-dropdown-content']}>
                <input
                    type="text"
                    placeholder="Clubs played against"
                    value={query}
                    onChange={onQueryChange}
                />
                {isDropdownVisible && suggestions.length > 0 && (
                    <ul className={shared['suggestions-dropdown']}>
                        {suggestions.map((suggestion, index) => (
                            <li key={index}
                                className={shared['suggestion-item']}
                                onClick={() => onSuggestionClick(suggestion[0])}
                            >
                                <img
                                    className={shared['club-badge']}
                                    alt="Badge of football team selected"
                                    src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(suggestion[0])}.png`}
                                />
                                {suggestion[1]}
                            </li>
                        ))}
                    </ul>
                )}
                <div className={shared['club-names-list']}>
                    {(selectedClubIds || []).map((club, index) => (
                        <span key={index} className={shared['club-name-item']}>
                            <img
                                className={shared['club-badge']}
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
