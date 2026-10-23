import React, {useRef, useState} from "react";
import styles from "./NaturalLanguageHero.module.css";
import type {FormEvent} from "react";

import FootballQueryForm from "../../../components/FootballQueryForm";
import {selectExampleQueries} from "../exampleQueries";

interface NaturalLanguageHeroProps {
    query: string;
    onQueryChange: (value: string) => void;
    onSubmit: (event?: FormEvent<HTMLFormElement>) => void | Promise<void>;
    isLoading: boolean;
    message: string | null;
}

const NaturalLanguageHero: React.FC<NaturalLanguageHeroProps> = ({
    query,
    onQueryChange,
    onSubmit,
    isLoading,
    message,
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [examples] = useState(() => selectExampleQueries());

    return (
        <section className={styles['nl-hero']} aria-labelledby="nl-hero-heading">
            <h1 id="nl-hero-heading" className={styles['nl-hero-heading']}>
                Go niche or go to the Beeb
            </h1>
            <p className={styles['nl-hero-intro']}>
                Search by goals, assists, appearances and more. Combine filters on top of filters to build queries no one else has ever asked.
            </p>
            <FootballQueryForm
                query={query}
                onQueryChange={onQueryChange}
                onSubmit={onSubmit}
                isLoading={isLoading}
                message={message}
                inputRef={textareaRef}
                hint="Write your own question or edit an example below."
            />
            <div className={styles['examples']}>
                <h2 className={styles['examples-heading']}>Example queries</h2>
                <div className={styles['example-grid']} role="group" aria-label="Example queries">
                    {examples.map(example => (
                        <button key={example.label} type="button" className={styles['example']} disabled={isLoading}
                            onClick={() => {
                                onQueryChange(example.query);
                                textareaRef.current?.focus();
                            }}>
                            <span className={styles['example-label']}>{example.label}<span aria-hidden="true">↗</span></span>
                            <span className={styles['example-query']}>{example.query}</span>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default NaturalLanguageHero;
