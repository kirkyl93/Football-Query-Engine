import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useLocation} from "react-router-dom";
import {isAbortError} from "../../../lib/apiError";

const REQUEST_LIMIT = 50;

interface UseInfiniteScrollResult<T> {
    data: T[];
    hasData: boolean;
    hasMore: boolean,
    loading: boolean;
    error: string | null;
    lastElementRef: <E extends HTMLElement>(node: E | null) => void;
    retry: () => void;
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
    const requestIdRef = useRef(0);
    const [retryCount, setRetryCount] = useState(0);

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
        requestIdRef.current += 1;
        setCurrentPage(0);
        setData([]);
        setHasData(false);
        setHasMore(true);
        setLoading(true);
        setError(null);
    }, []);

    const retry = useCallback(() => {
        setError(null);
        setRetryCount((count) => count + 1);
    }, []);

    const fetchData = async (): Promise<void> => {
        if (currentPage >= 5) {
            setHasMore(false);
            setLoading(false);
            return;
        }

        setLoading(true);
        // Clear any previous failure as soon as a new attempt starts so a
        // stale message never hangs around alongside fresh results.
        setError(null);
        abortCurrentRequest();
        const controller = new AbortController();
        currentRequestController.current = controller;
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        try {
            const newData = await fetchFunction({
                page: currentPage,
                limit: REQUEST_LIMIT,
                signal: controller.signal,
                searchParams: currentSearchParams
            });

            // Ignore responses from superseded requests (rapid filter changes).
            if (requestId !== requestIdRef.current || controller.signal.aborted) {
                return;
            }
            if (newData.length < REQUEST_LIMIT) {
                setHasMore(false);
            }

            if (currentPage === 0) {
                setData(newData);
                setHasData(true);
            } else {
                setData(prevData => [...prevData, ...newData]);
            }
            setError(null);
        } catch (error) {
            if (isAbortError(error)) {
                return;
            }
            // Ignore late failures from superseded requests.
            if (requestId !== requestIdRef.current) {
                return;
            }
            setError('Failed to fetch data');
            // fetchJson already wrote structured context to console.error.
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
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
    }, [currentSearchParams.toString(), currentPage, retryCount]);

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
        lastElementRef,
        retry
    }
}
