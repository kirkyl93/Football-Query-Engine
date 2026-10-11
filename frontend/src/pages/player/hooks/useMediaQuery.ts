import {useEffect, useState} from "react";

/** Viewport widths below this get no compare UI: two player headers cannot share one row. */
export const COMPARE_MIN_WIDTH_PX = 1100;

/** Live boolean for a CSS media query (defaults to false without matchMedia). */
export const useMediaQuery = (query: string): boolean => {
    const getMatch = (): boolean =>
        typeof window !== "undefined" && typeof window.matchMedia !== "undefined"
            ? window.matchMedia(query).matches
            : false;
    const [matches, setMatches] = useState<boolean>(getMatch);

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia === "undefined") {
            return;
        }
        const list = window.matchMedia(query);
        const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
        list.addEventListener("change", onChange);
        setMatches(list.matches);
        return () => list.removeEventListener("change", onChange);
    }, [query]);

    return matches;
};
