import React, {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import './Header.css';
import {Player} from "../types/Player";

const Header: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
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

    const handleSuggestionClick = (suggestion: string) => {
        setSearchTerm('');
        setIsDropdownVisible(false);
    };

    return (
        <header className="header">
            <nav className="nav">
                <Link to="/?seasons=2024&comps=GB1&penalty=ip&home=e&sort=g&scope=o">
                    <img
                        src={'/src/assets/football.png'}
                        alt={`Football`}
                        style={{
                            width: '40px',
                            height: '40px',
                            marginRight: '10px',
                            borderRadius: '50%'
                        }}
                    />
                </Link>
                <form ref={dropdownRef} className="search-form">
                    <input
                        type="text"
                        placeholder="Search for a player..."
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
                                    onClick={() => handleSuggestionClick(suggestion.last_name)}
                                >
                                    <Link to={`/player/${suggestion.player_id}`} style={{
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        <img
                                            src={`https://flagicons.lipis.dev/flags/4x3/${suggestion.country_code}.svg`}
                                            alt={`${suggestion.country_of_citizenship}`}
                                            style={{
                                                width: '20px',
                                                height: '13px',
                                                marginRight: '6px',
                                                marginLeft: '6px',
                                                borderRadius: 1
                                            }}
                                        />
                                        <img
                                            src={suggestion.image_url || 'fake_image.jpg'}
                                            alt={`${suggestion.first_name} ${suggestion.last_name}`}
                                            style={{
                                                width: '30px',
                                                height: '37px',
                                                marginRight: '10px',
                                                borderRadius: '50%'
                                            }}
                                        />
                                        <span>{`${suggestion.first_name} ${suggestion.last_name}`}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </form>
            </nav>
        </header>
    );
};

export default Header;