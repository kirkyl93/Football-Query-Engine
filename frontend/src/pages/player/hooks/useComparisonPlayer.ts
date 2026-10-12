import {useEffect, useState} from "react";
import {createDefaultPlayerStats, Player, PlayerAppearance, PlayerStats} from "../../../types/Player";
import {API_BASE_URL} from "../../../config";

interface UseComparisonPlayerResult {
    comparisonPlayerName: string;
    comparisonPlayer: Player | null;
    comparisonPlayerGameData: PlayerAppearance[];
    zoomedComparisonPlayerGameData: PlayerAppearance[];
    setZoomedComparisonPlayerGameData: (data: PlayerAppearance[]) => void;
    comparisonStats: PlayerStats;
    setComparisonStats: (stats: PlayerStats) => void;
    comparisonLoading: boolean;
    comparisonError: string | null;
    selectComparisonPlayer: (playerId: number, playerName: string) => void;
    clearComparison: () => void;
}

/** Owns the compare-with player selection; resets when the main player changes. */
export const useComparisonPlayer = (playerId: string | undefined): UseComparisonPlayerResult => {
    const [comparisonPlayerName, setComparisonPlayerName] = useState<string>("");
    const [comparisonPlayer, setComparisonPlayer] = useState<Player | null>(null);
    const [comparisonPlayerGameData, setComparisonPlayerGameData] = useState<PlayerAppearance[]>([]);
    const [zoomedComparisonPlayerGameData, setZoomedComparisonPlayerGameData] = useState<PlayerAppearance[]>([]);
    const [comparisonStats, setComparisonStats] = useState<PlayerStats>(createDefaultPlayerStats);
    const [comparisonLoading, setComparisonLoading] = useState<boolean>(false);
    const [comparisonError, setComparisonError] = useState<string | null>(null);

    useEffect(() => {
        setComparisonPlayerGameData([]);
        setComparisonPlayerName("");
        setComparisonPlayer(null);
        setComparisonError(null);
    }, [playerId]);

    const selectComparisonPlayer = (selectedPlayerId: number, playerName: string) => {
        setComparisonLoading(true);
        setComparisonError(null);
        Promise.all([
            fetch(`${API_BASE_URL}/players/${selectedPlayerId}`).then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json() as Promise<Player[]>;
            }),
            fetch(`${API_BASE_URL}/players/${selectedPlayerId}/games`).then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json() as Promise<PlayerAppearance[]>;
            }),
        ])
            .then(([playerData, playerGameData]) => {
                const profile = playerData[0] ?? null;
                if (!profile) {
                    throw new Error('Player not found');
                }
                setComparisonPlayer(profile);
                setComparisonPlayerName(playerName);
                setComparisonPlayerGameData(playerGameData);
            })
            .catch(() => {
                setComparisonError('Failed to load comparison player data');
            })
            .finally(() => {
                setComparisonLoading(false);
            });
    };

    const clearComparison = () => {
        setComparisonPlayerName("");
        setComparisonPlayer(null);
        setComparisonPlayerGameData([]);
        setZoomedComparisonPlayerGameData([]);
        setComparisonStats(createDefaultPlayerStats());
        setComparisonError(null);
    };

    return {
        comparisonPlayerName,
        comparisonPlayer,
        comparisonPlayerGameData,
        zoomedComparisonPlayerGameData,
        setZoomedComparisonPlayerGameData,
        comparisonStats,
        setComparisonStats,
        comparisonLoading,
        comparisonError,
        selectComparisonPlayer,
        clearComparison,
    };
};
