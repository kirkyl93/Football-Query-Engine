import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import styles from './Header.module.css';
import PlayerSearchBar from "./PlayerSearchBar";

const Header: React.FC = () => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isSearchOpen) {
            return;
        }
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        };
        const handleEscPress = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsSearchOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscPress);
        searchRef.current?.querySelector('input')?.focus();

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscPress);
        };
    }, [isSearchOpen]);

    return (
        <header className={styles['header']}>
            <nav className={styles['nav']}>
                <Link to="/?seasons=2025&comps=GB1&penalty=ip&home=e&sort=g&scope=o">
                    <img
                        src={'/football.png'}
                        alt={`Football`}
                        style={{
                            width: '40px',
                            height: '40px',
                            marginRight: '10px',
                            borderRadius: '50%'
                        }}
                    />
                </Link>
                <div className={styles['header-title']}>
                    The European Football Query Engine
                    <span className={styles['header-subtitle']}>'92 onwards because football didn't exist before then... did it?</span>
                </div>
                <div className={styles['search-wrapper']} ref={searchRef}>
                    <button
                        type="button"
                        className={styles['search-toggle']}
                        onClick={() => setIsSearchOpen((open) => !open)}
                        aria-expanded={isSearchOpen}
                        aria-label={isSearchOpen ? "Close search" : "Search for a player"}
                    >
                        {isSearchOpen ? (
                            <span aria-hidden="true">✕</span>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                <circle cx="11" cy="11" r="7" />
                                <line x1="16.5" y1="16.5" x2="21" y2="21" />
                            </svg>
                        )}
                    </button>
                    {isSearchOpen && (
                        <div className={styles['search-dropdown']}>
                            <PlayerSearchBar
                                placeHolderText={"Search for a player..."}
                                linkToPlayer={true}
                                onDismiss={() => setIsSearchOpen(false)}
                            />
                        </div>
                    )}
                </div>
            </nav>
        </header>
    );
};

export default Header;