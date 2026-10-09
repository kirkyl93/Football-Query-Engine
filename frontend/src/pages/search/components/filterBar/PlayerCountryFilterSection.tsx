import React from "react";
import {Country} from "../../../../data/Countries";
import FilterSection from "../../../../components/FilterSection";
import shared from '../../../../styles/shared.module.css';

interface PlayerCountryFilterSectionProps {
    selectedCountries: Country[];
    query: string;
    filteredCountries: Country[];
    onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSelectCountry: (country: Country) => void;
    onRemoveCountry: (countryName: string) => void;
}

const PlayerCountryFilterSection: React.FC<PlayerCountryFilterSectionProps> = ({
    selectedCountries,
    query,
    filteredCountries,
    onQueryChange,
    onSelectCountry,
    onRemoveCountry,
}) => {
    return (
        <FilterSection title="PLAYER COUNTRIES">
            <div className={shared['player-name-and-club-dropdown-content']}>
                <input
                    type="text"
                    placeholder="Enter country"
                    value={query}
                    onChange={onQueryChange}
                />

                {filteredCountries.length > 0 && (
                    <ul className={shared['suggestions-dropdown']}>
                        {filteredCountries.map((country) => (
                            <li
                                key={country.code}
                                className={shared['suggestion-item']}
                                onClick={() => onSelectCountry(country)}
                            >
                                <img
                                    src={`https://flagcdn.com/w20/${country.code}.png`}
                                    alt={country.name}
                                    className={shared['flag-icon']}
                                />
                                {country.name}
                            </li>
                        ))}
                    </ul>
                )}

                <div className={shared['player-names-and-clubs-list']}>
                    {(selectedCountries || []).map((country, index) => (
                        <span key={index} className={shared['player-name-item']}>
                            <img
                                src={`https://flagcdn.com/w20/${country.code}.png`}
                                alt={country.name}
                                className={shared['flag-icon']}
                            />
                            {country.name}
                            <button
                                onClick={() => onRemoveCountry(country.name)}
                                className="remove-button"
                            >x</button>
                        </span>
                    ))}
                </div>
            </div>
        </FilterSection>
    );
};

export default PlayerCountryFilterSection;
