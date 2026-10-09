import React from "react";
import {Club} from "../../../../types/Club";
import FilterSection from "../../../../components/FilterSection";
import shared from '../../../../styles/shared.module.css';

interface ClubAutocompleteProps {
    query: string;
    suggestions: Club[];
    isDropdownVisible: boolean;
    onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSuggestionClick: (clubId: number) => void;
}

interface ClubsFilterSectionProps {
    clubsPlayedFor: number[];
    clubsPlayedAgainst: number[];
    playedFor: ClubAutocompleteProps;
    playedAgainst: ClubAutocompleteProps;
    onRemovePlayedForClub: (clubId: number) => void;
    onRemovePlayedAgainstClub: (clubId: number) => void;
}

const badgeUrl = (clubId: number | string) =>
    `https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(clubId)}.png`;

const clubInputBlock = (
    placeholder: string,
    autocomplete: ClubAutocompleteProps,
    selectedClubIds: number[],
    selectedListClassName: string,
    onRemoveClub: (clubId: number) => void,
) => (
    <div className={shared['player-name-and-club-dropdown-content']}>
        <input
            type="text"
            placeholder={placeholder}
            value={autocomplete.query}
            onChange={autocomplete.onQueryChange}
        />
        {autocomplete.isDropdownVisible && autocomplete.suggestions.length > 0 && (
            <ul className={shared['suggestions-dropdown']}>
                {autocomplete.suggestions.map((suggestion, index) => (
                    <li key={index}
                        className={shared['suggestion-item']}
                        onClick={() => autocomplete.onSuggestionClick(suggestion.club_id)}
                    >
                                <img
                                    className={shared['club-badge']}
                                    alt="Badge of football team selected"
                                    src={badgeUrl(suggestion.club_id)}
                                />
                        {suggestion.name}
                    </li>
                ))}
            </ul>
        )}
        <div className={selectedListClassName}>
            {(selectedClubIds || []).map((club, index) => (
                <span key={index} className={shared['club-name-item']}>
                            <img
                                className={shared['club-badge']}
                                alt="Badge of football team selected"
                                src={badgeUrl(club)}
                            />
                    <button onClick={() => onRemoveClub(club)}>x</button>
                </span>
            ))}
        </div>
    </div>
);

const ClubsFilterSection: React.FC<ClubsFilterSectionProps> = ({
    clubsPlayedFor,
    clubsPlayedAgainst,
    playedFor,
    playedAgainst,
    onRemovePlayedForClub,
    onRemovePlayedAgainstClub,
}) => {
    return (
        <FilterSection title="CLUBS">
            {clubInputBlock("Clubs played for", playedFor, clubsPlayedFor, "player-names-and-clubs-list", onRemovePlayedForClub)}
            {clubInputBlock("Clubs played against", playedAgainst, clubsPlayedAgainst, "club-names-list", onRemovePlayedAgainstClub)}
        </FilterSection>
    );
};

export default ClubsFilterSection;
