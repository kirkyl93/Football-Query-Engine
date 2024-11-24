import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useLocation} from "react-router-dom";

const REQUEST_LIMIT = 50;

interface UseInfiniteScrollResult<T> {
    data: T[];
    hasData: boolean;
    hasMore: boolean,
    loading: boolean;
    error: string | null;
    lastElementRef: <E extends HTMLElement>(node: E | null) => void;
}

export interface FetchParams {
    page: number;
    limit: number;
    signal: AbortSignal;
    searchParams: URLSearchParams;
}

export function useInfiniteScroll<T>(
    fetchFunction: (params: FetchParams) => Promise<T[]>,
): UseInfiniteScrollResult<T> {
    const [data, setData] = useState<T[]>([]);
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
        return new URLSearchParams(location.search);
    }, [location.search]);

    const abortCurrentRequest = useCallback(() => {
        if (currentRequestController.current) {
            currentRequestController.current.abort();
            currentRequestController.current = null;
        }
    }, []);

    const resetState = useCallback(() => {
        setCurrentPage(0);
        setData([]);
        setHasData(false);
        setHasMore(true);
        setLoading(true);
    }, []);

    const fetchData = async (): Promise<void> => {
        if (currentPage >= 5) {
            setHasMore(false);
            return;
        }

        setLoading(true);
        abortCurrentRequest();
        currentRequestController.current = new AbortController();

        try {
            const newData = await fetchFunction({
                page: currentPage,
                limit: REQUEST_LIMIT,
                signal: currentRequestController.current.signal,
                searchParams: currentSearchParams
            });

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
                setError('Failed to fetch data');
            }
        }
    };

    useEffect(() => {
        const currentSearchParamsString = currentSearchParams.toString();
        if (prevSearchParamsRef.current !== currentSearchParamsString) {
            abortCurrentRequest();
            resetState();
            prevSearchParamsRef.current = currentSearchParamsString;
        }

        fetchData();
    }, [currentSearchParams.toString(), currentPage]);

    const lastElementRef = useCallback(
        <E extends HTMLElement>(node: E | null) => {
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
        }, [hasMore, loading]
    )

    useEffect(() => {
        return () => {
            abortCurrentRequest();
            observer.current?.disconnect();
        };
    }, []);

    return {
        data,
        hasData,
        hasMore,
        loading,
        error,
        lastElementRef
    }
}