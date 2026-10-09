import React from "react";
import PlayerSearchBar from "../../../components/PlayerSearchBar";
import {PlayerAppearance} from "../../../types/Player";

interface PlayerComparisonBarProps {
    comparisonPlayerName: string;
    onSelectPlayer: (playerName: string, playerGameData: PlayerAppearance[]) => void;
    onClearComparison: () => void;
}

const PlayerComparisonBar: React.FC<PlayerComparisonBarProps> = ({
    comparisonPlayerName,
    onSelectPlayer,
    onClearComparison,
}) => {
    return (
        <div style={{display: 'flex', alignItems: 'center'}}>
            <PlayerSearchBar
                placeHolderText={"Compare with..."}
                linkToPlayer={false}
                onSelectPlayer={onSelectPlayer}
            />
            {comparisonPlayerName.length > 0 && <button
                onClick={onClearComparison}
                style={{
                    marginLeft: '3px',
                    background: 'none',
                    fontWeight: '550',
                    fontSize: '14px',
                    color: 'black',
                    cursor: 'pointer'
                }}
            >
                X
            </button>
            }
        </div>
    );
};

export default PlayerComparisonBar;
