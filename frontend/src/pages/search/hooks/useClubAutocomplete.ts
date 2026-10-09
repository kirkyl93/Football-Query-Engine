import {useEffect, useState} from "react";
import {Club} from "../../../types/Club";
import {API_BASE_URL} from "../../../config";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;
const SUGGESTION_LIMIT = 10;

/**
 * Debounced club-name autocomplete against /clubs.
 * Owns query text, fetched suggestions and dropdown visibility.
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
            void fetchSuggestions(query.trim());
        }, DEBOUNCE_MS);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const fetchSuggestions = async (name: string) => {
        try {
            if (name.length < MIN_QUERY_LENGTH) {
                return;
            }
            const response = await fetch(
                `${API_BASE_URL}/clubs?search_name=${encodeURIComponent(name)}&page=0&limit=${SUGGESTION_LIMIT}`
            );
            const data: Club[] = await response.json();
            setSuggestions(data);
            setIsDropdownVisible(true);
        } catch (error) {
            console.error(`Error fetching suggestions: `, error);
        }
    };

    const clear = () => {
        setQuery("");
        setSuggestions([]);
        setIsDropdownVisible(false);
    };

    return {query, setQuery, suggestions, isDropdownVisible, setIsDropdownVisible, clear};
};

export type ClubAutocomplete = ReturnType<typeof useClubAutocomplete>;
