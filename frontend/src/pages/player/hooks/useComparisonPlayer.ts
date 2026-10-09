import {useEffect, useState} from "react";
import {createDefaultPlayerStats, PlayerAppearance, PlayerStats} from "../../../types/Player";

interface UseComparisonPlayerResult {
    comparisonPlayerName: string;
    comparisonPlayerGameData: PlayerAppearance[];
    zoomedComparisonPlayerGameData: PlayerAppearance[];
    setZoomedComparisonPlayerGameData: (data: PlayerAppearance[]) => void;
    comparisonStats: PlayerStats;
    setComparisonStats: (stats: PlayerStats) => void;
    handleSelectPlayer: (playerName: string, playerGameData: PlayerAppearance[]) => void;
    clearComparison: () => void;
}

/** Owns the compare-with player selection; resets when the main player changes. */
export const useComparisonPlayer = (playerId: string | undefined): UseComparisonPlayerResult => {
    const [comparisonPlayerName, setComparisonPlayerName] = useState<string>("");
    const [comparisonPlayerGameData, setComparisonPlayerGameData] = useState<PlayerAppearance[]>([]);
    const [zoomedComparisonPlayerGameData, setZoomedComparisonPlayerGameData] = useState<PlayerAppearance[]>([]);
    const [comparisonStats, setComparisonStats] = useState<PlayerStats>(createDefaultPlayerStats);

    useEffect(() => {
        setComparisonPlayerGameData([]);
        setComparisonPlayerName("");
    }, [playerId]);

    const handleSelectPlayer = (playerName: string, playerGameData: PlayerAppearance[]) => {
        setComparisonPlayerName(playerName);
        setComparisonPlayerGameData(playerGameData);
    };

    const clearComparison = () => {
        setComparisonPlayerName("");
        setComparisonPlayerGameData([]);
        setZoomedComparisonPlayerGameData([]);
        setComparisonStats(createDefaultPlayerStats());
    };

    return {
        comparisonPlayerName,
        comparisonPlayerGameData,
        zoomedComparisonPlayerGameData,
        setZoomedComparisonPlayerGameData,
        comparisonStats,
        setComparisonStats,
        handleSelectPlayer,
        clearComparison,
    };
};
