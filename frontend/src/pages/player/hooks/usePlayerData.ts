import {useEffect, useState} from "react";
import {Player, PlayerAppearance} from "../../../types/Player";
import {API_BASE_URL} from "../../../config";

interface UsePlayerDataResult {
    playerData: Player | null;
    playerGameData: PlayerAppearance[];
    loading: boolean;
    error: string | null;
}

/** Fetches the player profile + game log for a playerId. */
export const usePlayerData = (playerId: string | undefined): UsePlayerDataResult => {
    const [playerData, setPlayerData] = useState<Player | null>(null);
    const [playerGameData, setPlayerGameData] = useState<PlayerAppearance[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlayerData = async () => {
            setLoading(true);
            try {
                const [playerResponse, playerGameDataResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/players/${playerId}`),
                    fetch(`${API_BASE_URL}/players/${playerId}/games`)
                ]);

                if (!playerResponse.ok || !playerGameDataResponse.ok) {
                    throw new Error('Network response was not ok');
                }

                const playerData: Player[] = await playerResponse.json();
                const playerGameData: PlayerAppearance[] = await playerGameDataResponse.json();

                setPlayerData(playerData[0]);
                setPlayerGameData(playerGameData);
            } catch (error) {
                setError('Failed to fetch player data');
            } finally {
                setLoading(false);
            }
        };
        fetchPlayerData();
    }, [playerId]);

    return {playerData, playerGameData, loading, error};
};
