import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FilterState, PlayerSearchResult, SortOptions, StatScope, UrlFilters} from './types'; // Import the Player type
import {Link, useLocation} from "react-router-dom";
import './InfiniteScrollTable.css';
import PlayerSearchTitle from "./PlayerSearchTitle";
import {formatSeason} from "./utils";

const REQUEST_LIMIT = 50;

interface InfiniteScrollTableProps {
    filterState: FilterState;
}

const InfiniteScrollTable: React.FC<InfiniteScrollTableProps> = (
    {
        filterState
    }) => {
    const [data, setData] = useState<PlayerSearchResult[]>([]);
    const [hasData, setHasData] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentRequestController = useRef<AbortController | null>(null);
    const observer = useRef<IntersectionObserver | null>(null);
    const location = useLocation();

    const prevSearchParamsRef = useRef<string>("-1");

    const currentSearchParams = useMemo(() => {
        return new URLSearchParams(location.search).toString();
    }, [location.search]);

    const abortCurrentRequest = () => {
        if (currentRequestController.current) {
            currentRequestController.current.abort();
            currentRequestController.current = null;
        }
    };

    useEffect(() => {
        const handleDataFetch = async () => {
            if (prevSearchParamsRef.current !== currentSearchParams) {
                abortCurrentRequest();
                setCurrentPage(0);
                setData([]);
                setHasData(false);
                setHasMore(true);
                setLoading(true);
                prevSearchParamsRef.current = currentSearchParams;
            }

            await fetchData();
        };

        handleDataFetch();
    }, [currentSearchParams, currentPage]);


    const fetchData = async (): Promise<void> => {
        setLoading(true);

        if (currentPage >= 5) {
            setHasMore(false);
            return;
        }

        abortCurrentRequest();
        currentRequestController.current = new AbortController();

        try {
            setError(null);

            const url = constructSearchUrl();
            const response = await fetch(url, {
                signal: currentRequestController.current.signal
            });

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            const newData: PlayerSearchResult[] = await response.json();

            if (currentRequestController.current && !currentRequestController.current.signal.aborted) {
                if (newData.length < REQUEST_LIMIT) {
                    setHasMore(false);
                }

                if (currentPage === 0) {
                    setData(newData);
                    setHasData(true);
                } else {
                    setData(prevData => [...prevData, ...newData]);
                }
            }
            setLoading(false);
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                setError('Failed to fetch players');
            }
        }
    };

    const constructSearchUrl = (): string => {
        let url = `http://localhost:8080/search?page=${currentPage}&limit=${REQUEST_LIMIT}`;
        const params = new URLSearchParams(location.search);

        const paramMapping = [
            UrlFilters.SEASONS, UrlFilters.COMPETITIONS, UrlFilters.POSITIONS, UrlFilters.MINUTE_FROM, UrlFilters.MINUTE_TO,
            UrlFilters.MINIMUM_AGE, UrlFilters.MAXIMUM_AGE, UrlFilters.PLAYER_NAMES, UrlFilters.CLUBS_PLAYED_FOR,
            UrlFilters.CLUBS_PLAYED_AGAINST, UrlFilters.PENALTIES, UrlFilters.SORT_BY, UrlFilters.SCOPE, UrlFilters.MINIMUM_APPEARANCES
        ];

        paramMapping.forEach((key) => {
            const value = params.get(key);
            if (value) {
                url += `&${key}=${value}`;
            }
        });

        if (params.has(UrlFilters.SUBS_ONLY)) {
            url += `&${UrlFilters.SUBS_ONLY}=1`;

            const earliestSub = params.get(UrlFilters.EARLIEST_SUB_ON_TIME);
            const latestSub = params.get(UrlFilters.LATEST_SUB_ON_TIME);

            if (earliestSub) {
                url += `&${UrlFilters.EARLIEST_SUB_ON_TIME}=${earliestSub}`;
            }

            if (latestSub) {
                url += `&${UrlFilters.LATEST_SUB_ON_TIME}=${latestSub}`;
            }
        }
        return url;
    };

    const lastPlayerElementRef = useCallback(
        (node: HTMLTableRowElement | null) => {
            if (loading) {
                return;
            }

            if (observer.current) {
                observer.current.disconnect();
            }

            observer.current = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    setCurrentPage(prevPage => prevPage + 1);
                }
            });

            if (node) {
                observer.current.observe(node);
            }
        },
        [hasMore, loading]
    );

    useEffect(() => {
        return () => {
            abortCurrentRequest();
            observer.current?.disconnect();
        };
    }, []);

    return (
        <div className="table-container">
            {hasData && (
                <>
                    <table className="generic-table">
                        <thead>
                        <tr>
                            <th>Rank</th>
                            <th className="player-name">Player</th>
                            <th className="column-to-hide">Clubs</th>
                            {filterState.statScope === StatScope.SEASON && <th>Season</th>}
                            <th className="column-to-hide">Position</th>
                            <th className="table-header">Apps</th>
                            <th className="table-header">Mins</th>
                            <th>Goals</th>
                            <th>Assists</th>
                            <th>Yellows</th>
                            <th>Reds</th>
                            {filterState.sortBy === SortOptions.MINUTES_PER_GOAL && <th>Mins per goal</th>}
                            {filterState.sortBy === SortOptions.MINUTES_PER_ASSIST && <th>Mins per assist</th>}
                            {filterState.sortBy === SortOptions.MINUTES_PER_GOAL_OR_ASSIST && <th>Mins per goal or assist</th>}
                            {filterState.sortBy === SortOptions.MINUTES_PER_YELLOW && <th>Mins per Yellow</th>}
                            {filterState.sortBy === SortOptions.MINUTES_PER_RED && <th>Mins per Red</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {data.map((player, index) => (
                            <tr key={player.player_id.toString() + player.season.toString()}
                                ref={data.length === index + 1 ? lastPlayerElementRef : null}
                            >
                                <td>
                                    {player.rank}.
                                </td>
                                <td>
                                    <img
                                        src={`https://flagicons.lipis.dev/flags/4x3/${player.country_code}.svg`}
                                        alt={`${player.country_code}`}
                                        style={{width: '20px', height: '14px', marginRight: '10px'}}
                                    />
                                    <img
                                        src={player.image_url}
                                        alt={player.player_name}
                                        width="50"
                                        style={{marginRight: '10px', borderRadius: '50%'}} // Circular image
                                    />
                                    <Link
                                        to={`/player/${player.player_id}`} // Use your route pattern
                                        style={{textDecoration: 'none', color: 'inherit'}} // Optional styling
                                    >
                                        {player.player_name}
                                    </Link>
                                </td>
                                <td className="column-to-hide">
                                    {player.clubs_played_for.split(',').map(clubId => {
                                        const trimmedClubId = clubId.trim();
                                        return (
                                            <img
                                                key={trimmedClubId}
                                                src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(trimmedClubId)}.png`}
                                                alt={`Club ${trimmedClubId}`}
                                                width="20px"
                                                style={{marginRight: '5px'}}
                                            />
                                        );
                                    })}
                                </td>
                                {filterState.statScope === StatScope.SEASON && <td>{formatSeason(player.season)}</td>}
                                <td className="column-to-hide">{player.sub_position}</td>
                                <td><strong>{player.total_appearances}</strong>
                                    {!filterState.subsOnly && (<> ({player.substitute_appearances})</>)}</td>
                                <td>{player.total_minutes_played}</td>
                                <td>{player.total_goals}</td>
                                <td>{player.total_assists}</td>
                                <td>{player.total_yellow_cards}</td>
                                <td>{player.total_red_cards}</td>
                                {filterState.sortBy === SortOptions.MINUTES_PER_GOAL && <td>{player.mins_per_goal}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_ASSIST && <td>{player.mins_per_assist}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_GOAL_OR_ASSIST && <td>{player.mins_per_goal_or_assist}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_YELLOW && <td>{player.mins_per_yellow}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_RED && <td>{player.mins_per_red}</td>}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </>
            )}

            {loading && !hasData && <div className="loader-container">
                <div className="bouncing-dots">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                </div>
            </div>}
            {loading && hasData && hasMore && <div className="loading">Loading more players...</div>}
            {error && <div className="error">{error}</div>}
        </div>
    );
};

export default InfiniteScrollTable;
