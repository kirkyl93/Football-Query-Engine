import React, {useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Player, PlayerAppearance} from "../types/Player";
import {API_BASE_URL} from "../config";
import styles from './PlayerSearchBar.module.css'

interface PlayerSearchBarProps {
    placeHolderText: string;
    linkToPlayer: boolean;
    onSelectPlayer?: (name: string, playerGameData: PlayerAppearance[]) => void;
    onSelectPlayerId?: (playerId: number, playerName: string) => void;
    disabled?: boolean;
    inputId?: string;
    onDismiss?: () => void;
}

const PlayerSearchBar: React.FC<PlayerSearchBarProps> = ({ placeHolderText, linkToPlayer, onSelectPlayer, onSelectPlayerId, disabled, inputId, onDismiss }) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [suggestions, setSuggestions] = useState<Player[]>([]);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const dropdownRef = useRef<HTMLFormElement>(null);
    const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
    const navigate = useNavigate();
    const listId = React.useId();

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

    // Keep the highlighted option in view while arrowing through results.
    useEffect(() => {
        if (highlightIndex >= 0) {
            itemRefs.current[highlightIndex]?.scrollIntoView?.({block: 'nearest'});
        }
    }, [highlightIndex]);

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
            const response = await fetch(`${API_BASE_URL}/players?search_name=${searchTerm}&page=0&limit=10`);
            const data = await response.json();
            setSuggestions(data);
            setIsDropdownVisible(true);
            // Preselect the top result so Enter immediately confirms it.
            setHighlightIndex(data.length > 0 ? 0 : -1);

        } catch (error) {
            console.error(`Error fetching suggestions: `, error);
        }
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setHighlightIndex(-1);
    };

    const handleSuggestionClick = async (suggestion: string, playerId: number) => {
        setSearchTerm('');
        setIsDropdownVisible(false);
        setHighlightIndex(-1);
        onDismiss?.();
        if (linkToPlayer) {
            navigate(`/player/${playerId}`);
            return;
        }
        if (onSelectPlayerId) {
            onSelectPlayerId(playerId, suggestion);
            return;
        }
        const playerGameData = await fetch(`${API_BASE_URL}/players/${playerId}/games`);
        const data: PlayerAppearance[] = await playerGameData.json();
        if (onSelectPlayer) {
            onSelectPlayer(suggestion, data);
        }
    };

    const highlightedSuggestion =
        isDropdownVisible && suggestions.length > 0
            ? suggestions[Math.min(Math.max(highlightIndex, 0), suggestions.length - 1)]
            : undefined;

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') {
            return;
        }
        if (!isDropdownVisible || suggestions.length === 0) {
            return;
        }
        e.preventDefault();
        if (e.key === 'ArrowDown') {
            setHighlightIndex((index) => Math.min(index + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            setHighlightIndex((index) => Math.max(index - 1, 0));
        } else if (highlightedSuggestion) {
            // Enter confirms the highlighted option; with nothing
            // highlighted the swallowed form submit keeps it a no-op.
            void handleSuggestionClick(highlightedSuggestion.last_name, highlightedSuggestion.player_id);
        }
    };

    return (
        <form
            ref={dropdownRef}
            className={styles['search-form']}
            // Enter in the input must not natively submit (it appends "?" to
            // the URL and reloads the page): selection happens by clicking
            // or arrowing to a suggestion and pressing Enter.
            onSubmit={(event) => event.preventDefault()}
        >
            <input
                type="text"
                id={inputId}
                placeholder={placeHolderText}
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleInputKeyDown}
                className={styles['search-input']}
                disabled={disabled}
                role="combobox"
                aria-expanded={isDropdownVisible && suggestions.length > 0}
                aria-controls={listId}
                aria-activedescendant={highlightedSuggestion ? `${listId}-option-${highlightedSuggestion.player_id}` : undefined}
            />

            {isDropdownVisible && suggestions.length > 0 && (
                <ul id={listId} role="listbox" className={styles['header-suggestions-dropdown']}>
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={index}
                            id={`${listId}-option-${suggestion.player_id}`}
                            role="option"
                            aria-selected={highlightedSuggestion?.player_id === suggestion.player_id}
                            className={`${styles['header-suggestion-item']} ${highlightedSuggestion?.player_id === suggestion.player_id ? styles['highlighted'] : ''}`}
                            onClick={() => handleSuggestionClick(suggestion.last_name, suggestion.player_id)}
                            onMouseEnter={() => setHighlightIndex(index)}
                            ref={(element) => {
                                itemRefs.current[index] = element;
                            }}
                        >
                            <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: '100%'
                                }}>
                                {renderPlayerContent(suggestion)}
                            </span>
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
        {/*<img src={player.image_url || '/football.png'}*/}
        {/*     alt={`${player.first_name} ${player.last_name}`}*/}
        {/*     style={{ width: '30px', height: '37px', marginRight: '10px', borderRadius: '50%' }}*/}
        {/*/>*/}
        <span>{`${player.first_name} ${player.last_name}`}</span>
    </>
);

export default PlayerSearchBar;