import {type FormEvent, useEffect, useRef, useState} from "react";
import {
    getNaturalLanguageSearchIssue,
    naturalLanguageFiltersToSearchState,
    translateNaturalLanguageSearch,
} from "../../../lib/naturalLanguageSearch";
import {SearchFilterState} from "../../../types/SearchFilterState";

interface UseNaturalLanguageQueryProps {
    query: string;
    onApplyFilters: (filterState: SearchFilterState) => void;
}

/**
 * Drives natural-language query translation. The caller owns the query text
 * (e.g. an input or a filled example chip); this hook handles the submit,
 * request cancellation and status/message state.
 */
export const useNaturalLanguageQuery = ({query, onApplyFilters}: UseNaturalLanguageQueryProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [summary, setSummary] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => () => abortRef.current?.abort(), []);

    const submit = async (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        // A new submit supersedes any in-flight request.
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);
        setMessage(null);

        try {
            const response = await translateNaturalLanguageSearch(query, controller.signal);
            if (controller.signal.aborted) return;

            const issue = getNaturalLanguageSearchIssue(response);
            if (issue) {
                setSummary(null);
                setMessage(issue);
                return;
            }

            const filters = await naturalLanguageFiltersToSearchState(response.filters, controller.signal);
            if (controller.signal.aborted) return;
            setSummary(response.summary);
            onApplyFilters(filters);
        } catch (error) {
            if (controller.signal.aborted) return;
            setSummary(null);
            setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
            }
        }
    };

    return {isLoading, message, summary, submit};
};
