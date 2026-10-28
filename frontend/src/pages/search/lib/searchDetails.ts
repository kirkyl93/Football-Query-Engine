import {SearchFilterState} from '../../../types/SearchFilterState';
import {HomeOrAwayOptions, numberOfGamesOrSeasonsSortOptions} from '../../../types/SearchOptions';
import {PlayerAppearance, PlayerNumberOfGamesOrSeasonsResult, PlayerSearchResult} from '../../../types/Player';
import {API_BASE_URL} from '../../../config';
import {ApiError, logApiError} from '../../../lib/apiError';

/** Player-only filters select the player, rather than excluding their games.
 * Seasons and competitions already define the scope of the wider detail view.
 */
export function hasGameQualificationFilters(filters: SearchFilterState): boolean {
    const from = Math.min(120, Math.max(0, filters.minuteFrom ?? 0));
    const to = Math.min(120, Math.max(0, filters.minuteTo ?? 120));
    return numberOfGamesOrSeasonsSortOptions.includes(filters.sortBy)
        || Math.min(from, to) !== 0 || Math.max(from, to) !== 120
        || filters.homeOrAway === HomeOrAwayOptions.HOME || filters.homeOrAway === HomeOrAwayOptions.AWAY
        || (filters.minAge ?? 0) > 0 || (filters.maxAge ?? 0) > 0
        || filters.clubsPlayedFor.length > 0 || filters.clubsPlayedAgainst.length > 0
        || filters.subsOnly;
}

export type DetailResult = PlayerSearchResult | PlayerNumberOfGamesOrSeasonsResult;
export interface DetailStats {
    appearances: number;
    minutes: number;
    goals: number;
    assists: number;
    yellows: number;
    reds: number;
}
export interface DetailGame extends PlayerAppearance {
    game_id: number;
    qualifies: boolean;
    matches_filters: boolean;
    stats: DetailStats;
}
export interface DetailSeason {
    season: number;
    qualifies: boolean;
    stats: DetailStats;
}

const numericParams = new Set(['page', 'limit', 'minfrom', 'minto', 'minage', 'maxage',
    'minheight', 'maxheight', 'subonly', 'earliestsub', 'latestsub', 'ma',
    'ming', 'maxg', 'mina', 'maxa', 'minga', 'maxga', 'miny', 'maxy', 'minr', 'maxr']);

export function detailRequest(search: string, result: DetailResult, resultSeason?: number) {
    const params = new URLSearchParams(search);
    params.delete('page');
    params.delete('limit');
    // Match constructSearchUrl: presence of the substitute flag enables it.
    if (params.has('subonly')) params.set('subonly', '1');
    return {
        search: Object.fromEntries([...params].map(([key, value]) =>
            [key, numericParams.has(key) ? Number(value) : value])),
        qualifying_game_ids: result.qualifying_game_ids ?? [],
        qualifying_seasons: 'qualifying_seasons' in result ? result.qualifying_seasons : [],
        result_season: resultSeason ?? null,
    };
}

export async function fetchSearchDetails(playerId: number, request: ReturnType<typeof detailRequest>, signal: AbortSignal): Promise<DetailGame[]> {
    const endpoint = `/players/${playerId}/search-details`;
    const url = `${API_BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(request), signal,
        });
        if (!response.ok) throw new ApiError('Unable to load search details', endpoint, response.status);
        return await response.json();
    } catch (error) {
        logApiError(endpoint, url, error);
        throw error;
    }
}

export const emptyDetailStats = (): DetailStats => ({appearances: 0, minutes: 0, goals: 0, assists: 0, yellows: 0, reds: 0});
export function addDetailStats(total: DetailStats, stats: DetailStats): DetailStats {
    return Object.fromEntries(Object.keys(total).map(key =>
        [key, total[key as keyof DetailStats] + stats[key as keyof DetailStats]])) as unknown as DetailStats;
}
export function detailSeasons(games: DetailGame[], qualifyingSeasons: number[]): DetailSeason[] {
    const seasons = new Map<number, DetailSeason>();
    const qualifying = new Set(qualifyingSeasons);
    for (const game of games) {
        const row = seasons.get(game.season) ?? {season: game.season, qualifies: qualifying.has(game.season), stats: emptyDetailStats()};
        if (game.matches_filters) row.stats = addDetailStats(row.stats, game.stats);
        seasons.set(game.season, row);
    }
    return [...seasons.values()].sort((a, b) => b.season - a.season);
}
