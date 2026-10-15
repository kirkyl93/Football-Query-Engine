import {useEffect, useState} from "react";
import {Player, PlayerAppearance} from "../../../types/Player";
import {API_BASE_URL} from "../../../config";
import {ApiError, logApiError} from "../../../lib/apiError";

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
            setError(null);
            try {
                const profileUrl = `${API_BASE_URL}/players/${playerId}`;
                const gamesUrl = `${API_BASE_URL}/players/${playerId}/games`;
                const [playerResponse, playerGameDataResponse] = await Promise.all([
                    fetch(profileUrl),
                    fetch(gamesUrl)
                ]);

                if (!playerResponse.ok) {
                    const error = new ApiError(
                        `Request failed with status ${playerResponse.status}`,
                        `/players/{id}`,
                        playerResponse.status,
                    );
                    logApiError(`/players/${playerId}`, profileUrl, error);
                    throw error;
                }
                if (!playerGameDataResponse.ok) {
                    const error = new ApiError(
                        `Request failed with status ${playerGameDataResponse.status}`,
                        `/players/{id}/games`,
                        playerGameDataResponse.status,
                    );
                    logApiError(`/players/${playerId}/games`, gamesUrl, error);
                    throw error;
                }

                const playerData: Player[] = await playerResponse.json();
                const playerGameData: PlayerAppearance[] = await playerGameDataResponse.json();

                setPlayerData(playerData[0]);
                setPlayerGameData(playerGameData);
                setError(null);
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }
                console.error('[player-fetch-failed]', {
                    playerId,
                    message: error instanceof Error ? error.message : String(error),
                });
                setError('Failed to fetch player data');
            } finally {
                setLoading(false);
            }
        };
        fetchPlayerData();
    }, [playerId]);

    return {playerData, playerGameData, loading, error};
};
