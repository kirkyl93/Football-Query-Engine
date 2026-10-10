import React from "react";
import {Club} from "../../../../types/Club";
import {getClubName} from "../../../../lib/ClubDirectory";
import FilterSection from "../../../../components/FilterSection";
import {clubsSummary} from "../../lib/filterSummaries";
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
                                    alt={suggestion.name}
                                    src={badgeUrl(suggestion.club_id)}
                                />
                        {suggestion.name}
                    </li>
                ))}
            </ul>
        )}
        <div className={selectedListClassName}>
            {(selectedClubIds || []).map((club, index) => (
                <span key={index} className={shared['club-name-item']} title={getClubName(club)}>
                            <img
                                className={shared['club-badge']}
                                alt={getClubName(club)}
                                src={badgeUrl(club)}
                            />
                    {getClubName(club)}
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
    const totalClubs = clubsPlayedFor.length + clubsPlayedAgainst.length;
    const clubBadges = (clubIds: number[], keyPrefix: string, title: string) => (
        <span className={shared['summary-inline']}>
            <span>{title}:</span>
            {clubIds.map((clubId) => (
                <img
                    key={`${keyPrefix}-${clubId}`}
                    className={shared['club-badge']}
                    alt={getClubName(clubId)}
                    title={`${title}: ${getClubName(clubId)}`}
                    src={badgeUrl(clubId)}
                />
            ))}
        </span>
    );
    const clubSummary =
        totalClubs === 0 || totalClubs > 4
            ? clubsSummary(clubsPlayedFor, clubsPlayedAgainst)
            : (
                <>
                    {clubsPlayedFor.length > 0 && clubBadges(clubsPlayedFor, "for", "For")}
                    {clubsPlayedAgainst.length > 0 && clubBadges(clubsPlayedAgainst, "against", "Against")}
                </>
            );
    return (
        <FilterSection title="CLUBS" summary={clubSummary}>
            {clubInputBlock("Clubs played for", playedFor, clubsPlayedFor, "player-names-and-clubs-list", onRemovePlayedForClub)}
            {clubInputBlock("Clubs played against", playedAgainst, clubsPlayedAgainst, "club-names-list", onRemovePlayedAgainstClub)}
        </FilterSection>
    );
};

export default ClubsFilterSection;
