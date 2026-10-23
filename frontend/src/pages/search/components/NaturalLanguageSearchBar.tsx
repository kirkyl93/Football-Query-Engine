import React, {useEffect, useRef, useState} from "react";
import styles from "./NaturalLanguageSearchBar.module.css";
import {useNaturalLanguageQuery} from "../hooks/useNaturalLanguageQuery";
import {SearchFilterState} from "../../../types/SearchFilterState";
import FootballQueryForm from "../../../components/FootballQueryForm";

interface NaturalLanguageSearchBarProps {
    onApplyFilters: (filterState: SearchFilterState) => void;
    isOpen?: boolean;
}

const NaturalLanguageSearchBar: React.FC<NaturalLanguageSearchBarProps> = ({onApplyFilters, isOpen = true}) => {
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const {isLoading, message, summary, submit} = useNaturalLanguageQuery({query, onApplyFilters});
    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    return (
        <section className={styles['nl-search']} aria-label="Search football statistics">
            <FootballQueryForm
                query={query}
                onQueryChange={setQuery}
                onSubmit={submit}
                isLoading={isLoading}
                message={message}
                label=""
                ariaLabel="Natural language search"
                inputRef={inputRef}
            />
            {summary && !message && !isLoading && <p className={styles['nl-search-summary']}>Results for: {summary}</p>}
        </section>
    );
};

export default NaturalLanguageSearchBar;
