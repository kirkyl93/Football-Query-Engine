import {describe, expect, it} from 'vitest';
import {detailRequest, hasGameQualificationFilters} from './searchDetails';
import type {PlayerSearchResult} from '../../../types/Player';

describe('detail request', () => {
    it('preserves encoded names, explicit zero bounds and numeric minute values without pagination', () => {
        const result = {player_id: 1, qualifying_game_ids: [2,3]} as PlayerSearchResult;
        expect(detailRequest('?names=Alex%20%26%20Jamie&comps=GB1&maxg=0&minfrom=46&page=2&limit=50', result, 2024)).toEqual({
            search: {names: 'Alex & Jamie', comps: 'GB1', maxg: 0, minfrom: 46},
            qualifying_game_ids: [2,3], qualifying_seasons: [], result_season: 2024,
        });
    });
});

import {createDefaultSearchFilterState} from './defaultSearchFilter';
import {HomeOrAwayOptions, PenaltyOptions, SortOptions} from '../../../types/SearchOptions';
import {SearchFilterState} from '../../../types/SearchFilterState';

describe('qualification toggle relevance', () => {
    const defaults = createDefaultSearchFilterState();
    it.each(Object.values(SortOptions).filter(sort => sort !== SortOptions.NUMBER_OF_GAMES_WITH && sort !== SortOptions.NUMBER_OF_SEASONS_WITH))('hides it for ordinary %s rankings with player-only filters', sortBy => {
        expect(hasGameQualificationFilters({...defaults, sortBy, minHeight: 180, maxHeight: 200,
            playerNames: ['Alex'], playerCountries: [{code: 'gb-eng', name: 'England'}],
            positions: ['CF'], minimumAppearances: 50})).toBe(false);
    });
    it.each<Partial<SearchFilterState>>([
        {minuteFrom: 0, minuteTo: 120}, {minuteFrom: -1, minuteTo: 130},
        {minuteFrom: 120, minuteTo: 0}, {minAge: 0, maxAge: 0},
        {penalties: PenaltyOptions.EXCLUDE_PENALTIES}, {penalties: PenaltyOptions.ONLY_PENALTIES},
    ])('hides it when settings do not exclude games: %j', filters => {
        expect(hasGameQualificationFilters({...defaults, ...filters})).toBe(false);
    });
    it.each<Partial<SearchFilterState>>([
        {minuteFrom: 46}, {minuteTo: 45}, {homeOrAway: HomeOrAwayOptions.HOME},
        {homeOrAway: HomeOrAwayOptions.AWAY}, {minAge: 21}, {maxAge: 21},
        {clubsPlayedFor: [101]}, {clubsPlayedAgainst: [102]}, {subsOnly: true},
        {sortBy: SortOptions.NUMBER_OF_GAMES_WITH}, {sortBy: SortOptions.NUMBER_OF_SEASONS_WITH},
    ])('shows it for game or season qualification: %j', filters => {
        expect(hasGameQualificationFilters({...defaults, ...filters})).toBe(true);
    });
});

it('sends card bounds as numeric values in season detail requests',()=>{
    const result={player_id:1,qualifying_game_ids:[]} as unknown as PlayerSearchResult;
    expect(detailRequest('?sort=sw&miny=10&maxy=12&minr=0&maxr=0',result).search).toEqual({sort:'sw',miny:10,maxy:12,minr:0,maxr:0});
});
