import {useEffect, useMemo, useState} from 'react';
import {isAbortError} from '../../../lib/apiError';
import {DetailResult, DetailGame, detailRequest, fetchSearchDetails} from '../lib/searchDetails';

// Bound both lifetime and size; key includes membership from the original result.
const cache = new Map<string, {games: DetailGame[]; expires: number}>();
export const clearSearchDetailsCache = () => cache.clear();

export function useSearchDetails(search: string, result: DetailResult, resultSeason?: number) {
    const request = useMemo(() => detailRequest(search, result, resultSeason), [search, result, resultSeason]);
    const key = `${result.player_id}:${JSON.stringify(request)}`;
    const [state, setState] = useState<{key: string; games?: DetailGame[]; error?: string}>({key});
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        const cached = cache.get(key);
        if (cached && cached.expires > Date.now()) {
            setState({key, games: cached.games});
            return () => controller.abort();
        }
        setState({key});
        fetchSearchDetails(result.player_id, request, controller.signal).then(games => {
            if (controller.signal.aborted) return;
            if (cache.size >= 20) cache.delete(cache.keys().next().value!);
            cache.set(key, {games, expires: Date.now() + 5 * 60_000});
            setState({key, games});
        }).catch(error => {
            if (!controller.signal.aborted && !isAbortError(error))
                setState({key, error: 'Unable to load details. Please try again.'});
        });
        return () => controller.abort();
    }, [key, request, result.player_id, attempt]);
    const current = state.key === key ? state : {key};
    return {...current, loading: !current.games && !current.error, retry: () => setAttempt(n => n + 1)};
}
