import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import { Player } from './types';

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
            if (searchTerm.trim()) {
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
                <Link to="/?seasons=2024&comps=GB1" className="nav-link">
                    <img src="/icons8-home.svg" alt="Home" className="home_icon" />
                </Link>
                
                <form ref={dropdownRef} className="search-form">
                    <input
                        type="text"
                        placeholder="Search for a player..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="search-input"
                    />
                    <button type="submit" className="search-button">Search</button>

                    {isDropdownVisible && suggestions.length > 0 && (
                        <ul className="suggestions-dropdown">
                            {suggestions.map((suggestion, index) => (
                                <li
                                    key={index}
                                    className="suggestion-item"
                                    onClick={() => handleSuggestionClick(suggestion.last_name)}
                                >
                                    <Link to={`/player/${suggestion.player_id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
                    <img 
                      src={`https://flagicons.lipis.dev/flags/4x3/${suggestion.country_code}.svg`} 
                      alt={`${suggestion.country_of_citizenship}`} 
                      style={{ width: '30px', height: '20px', marginRight: '10px', borderRadius: 1 }} 
                    />
                    <img 
                      src={suggestion.image_url || 'fake_image.jpg'} 
                      alt={`${suggestion.first_name} ${suggestion.last_name}`} 
                      style={{ width: '40px', height: '50px', marginRight: '10px', borderRadius: '50%' }}
                    />
                    <span>{`${suggestion.first_name} ${suggestion.last_name}`}</span>
                  </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </form>

                <Link to="/player-stats" className="nav-link">Player Stats</Link>
            </nav>
        </header>
    );
};

export default Header;