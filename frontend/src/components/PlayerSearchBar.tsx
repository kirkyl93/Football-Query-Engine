import React, {useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {Player, PlayerAppearance} from "../types/Player";
import './PlayerSearchBar.css'

interface PlayerSearchBarProps {
    placeHolderText: string;
    linkToPlayer: boolean;
    onSelectPlayer?: (name: string, playerGameData: PlayerAppearance[]) => void;
}

const PlayerSearchBar: React.FC<PlayerSearchBarProps> = ({ placeHolderText, linkToPlayer, onSelectPlayer }) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [suggestions, setSuggestions] = useState<Player[]>([]);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const dropdownRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setSearchTerm('');
                setIsDropdownVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const handleEscPress = (event: KeyboardEvent) => {
            if (dropdownRef.current && event.key === 'Escape') {
                setSearchTerm('');
                setIsDropdownVisible(false);
            }
        };

        document.addEventListener('keydown', handleEscPress);

        return () => {
            document.removeEventListener('keydown', handleEscPress);
        }
    })

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm.trim().length > 1) {
                fetchSuggestions(searchTerm);
            } else {
                setSuggestions([]);
                setIsDropdownVisible(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const fetchSuggestions = async (query: string) => {
        try {
            const response = await fetch(`http://localhost:8080/players?search_name=${searchTerm}&page=0&limit=10`);
            const data = await response.json();
            setSuggestions(data);
            setIsDropdownVisible(true);

        } catch (error) {
            console.error(`Error fetching suggestions: `, error);
        }
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleSuggestionClick = async (suggestion: string, playerId: number) => {
        setSearchTerm('');
        setIsDropdownVisible(false);
        if (!linkToPlayer) {
            const playerGameData = await fetch(`http://localhost:8080/players/${playerId}/games`);
            const data: PlayerAppearance[] = await playerGameData.json();
            if (onSelectPlayer) {
                onSelectPlayer(suggestion, data);
            }
        }
    };

    return (
        <form ref={dropdownRef} className="search-form">
            <input
                type="text"
                placeholder={placeHolderText}
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
            />

            {isDropdownVisible && suggestions.length > 0 && (
                <ul className="header-suggestions-dropdown">
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={index}
                            className="header-suggestion-item"
                            onClick={() => handleSuggestionClick(suggestion.last_name, suggestion.player_id)}
                        >
                            {linkToPlayer ? (
                                <Link to={`/player/${suggestion.player_id}`} className="player-link" style={{
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                    {renderPlayerContent(suggestion)}
                                </Link>
                            ) : (
                                <>
                                {renderPlayerContent(suggestion)}
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </form>
    );
};

const renderPlayerContent = (player: Player) => (
    <>
        <img src={`https://flagicons.lipis.dev/flags/4x3/${player.country_code}.svg`}
             alt={player.country_of_citizenship}
             style={{ width: '20px', height: '13px', marginRight: '6px', marginLeft: '6px', borderRadius: 1 }}
        />
        <img src={player.image_url || 'fake_image.jpg'}
             alt={`${player.first_name} ${player.last_name}`}
             style={{ width: '30px', height: '37px', marginRight: '10px', borderRadius: '50%' }}
        />
        <span>{`${player.first_name} ${player.last_name}`}</span>
    </>
);

export default PlayerSearchBar;