import React from "react";
import PlayerSearchBar from "../../../components/PlayerSearchBar";
import {Player} from "../../../types/Player";
import PlayerInfoHeader from "./PlayerInfoHeader";

interface PlayerComparisonBarProps {
    comparisonPlayerName: string;
    comparisonPlayer: Player | null;
    comparisonLoading: boolean;
    comparisonError: string | null;
    onSelectPlayerId: (playerId: number, playerName: string) => void;
}

/**
 * Compare panel: search for a player, then show their picture and info
 * mirroring the main player's header, with loading and error states.
 */
const PlayerComparisonBar: React.FC<PlayerComparisonBarProps> = ({
    comparisonPlayerName,
    comparisonPlayer,
    comparisonLoading,
    comparisonError,
    onSelectPlayerId,
}) => {
    if (comparisonPlayerName.length === 0) {
        return (
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <label
                    htmlFor="compare-player-search"
                    style={{fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap'}}
                >
                    Compare against
                </label>
                <PlayerSearchBar
                    placeHolderText={"Search for a player..."}
                    linkToPlayer={false}
                    onSelectPlayerId={onSelectPlayerId}
                    disabled={comparisonLoading}
                    inputId="compare-player-search"
                />
                {comparisonLoading && (
                    <span style={{fontSize: '14px'}} aria-live="polite">
                        Loading…
                    </span>
                )}
                {comparisonError && (
                    <span role="alert" style={{fontSize: '14px', color: '#b00020'}}>
                        {comparisonError}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            {comparisonPlayer && <PlayerInfoHeader playerData={comparisonPlayer} mirror/>}
            {comparisonError && (
                <span role="alert" style={{fontSize: '14px', color: '#b00020'}}>
                    {comparisonError}
                </span>
            )}
        </div>
    );
};

export default PlayerComparisonBar;
