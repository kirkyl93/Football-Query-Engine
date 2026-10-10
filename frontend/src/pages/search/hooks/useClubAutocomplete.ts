import {useEffect, useState} from "react";
import {Club} from "../../../types/Club";
import {searchClubs} from "../../../lib/ClubDirectory";

const DEBOUNCE_MS = 120;
const MIN_QUERY_LENGTH = 2;
const SUGGESTION_LIMIT = 10;

/**
 * Local club-name autocomplete over the in-memory club map.
 * Same return shape as the previous /clubs-backed hook, so callers
 * (SearchFilterBar) need no changes. No DB round-trips.
 */
export const useClubAutocomplete = () => {
    const [query, setQuery] = useState<string>("");
    const [suggestions, setSuggestions] = useState<Club[]>([]);
    const [isDropdownVisible, setIsDropdownVisible] = useState<boolean>(false);

    useEffect(() => {
        if (!query.trim()) {
            setSuggestions([]);
            setIsDropdownVisible(false);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            const trimmed = query.trim();
            if (trimmed.length < MIN_QUERY_LENGTH) {
                return;
            }
            setSuggestions(searchClubs(trimmed, SUGGESTION_LIMIT));
            setIsDropdownVisible(true);
        }, DEBOUNCE_MS);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const clear = () => {
        setQuery("");
        setSuggestions([]);
        setIsDropdownVisible(false);
    };

    return {query, setQuery, suggestions, isDropdownVisible, setIsDropdownVisible, clear};
};

export type ClubAutocomplete = ReturnType<typeof useClubAutocomplete>;
