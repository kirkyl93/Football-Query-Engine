import React from "react";
import FilterSection from "./FilterSection";

interface PlayerNameFilterSectionProps {
    playerNames: string[];
    inputValue: string;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onRemovePlayerName: (name: string) => void;
}

const PlayerNameFilterSection: React.FC<PlayerNameFilterSectionProps> = ({
    playerNames,
    inputValue,
    onInputChange,
    onKeyDown,
    onRemovePlayerName,
}) => {
    return (
        <FilterSection title="PLAYER NAMES">
            <div className="player-name-and-club-dropdown-content">
                <input
                    type="text"
                    placeholder="Enter player name"
                    value={inputValue}
                    onChange={onInputChange}
                    onKeyDown={onKeyDown}
                />
                <div className="player-names-and-clubs-list">
                    {playerNames.map((name, index) => (
                        <span key={index} className="player-name-item">
                            {name}
                            <button onClick={() => onRemovePlayerName(name)}>x</button>
                        </span>
                    ))}
                </div>
            </div>
        </FilterSection>
    );
};

export default PlayerNameFilterSection;
