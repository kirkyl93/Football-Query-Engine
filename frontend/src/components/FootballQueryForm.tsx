import {useCallback, useEffect, useId, useRef} from "react";
import type {FormEvent, KeyboardEvent, RefObject} from "react";
import styles from "./FootballQueryForm.module.css";

interface FootballQueryFormProps {
    query: string;
    onQueryChange: (value: string) => void;
    onSubmit: (event?: FormEvent<HTMLFormElement>) => void | Promise<void>;
    isLoading: boolean;
    message: string | null;
    label?: string;
    ariaLabel?: string;
    hint?: string;
    inputRef?: RefObject<HTMLTextAreaElement | null>;
}

export default function FootballQueryForm({
    query,
    onQueryChange,
    onSubmit,
    isLoading,
    message,
    label = "What do you want to find out?",
    ariaLabel = "Describe the football statistics you want to find",
    hint = "",
    inputRef,
}: FootballQueryFormProps) {
    const id = useId();
    const ownRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = inputRef ?? ownRef;
    const canSubmit = query.trim().length > 0;

    const autosize = useCallback(() => {
        const element = textareaRef.current;
        if (!element) return;
        const maxHeight = parseFloat(window.getComputedStyle(element).maxHeight) || Infinity;
        element.style.height = "auto";
        element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
        element.style.height = `${element.scrollHeight}px`;
    }, [textareaRef]);

    useEffect(() => { autosize(); }, [query, autosize]);
    useEffect(() => {
        window.addEventListener("resize", autosize);
        return () => window.removeEventListener("resize", autosize);
    }, [autosize]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit || isLoading) return;
        void onSubmit(event);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
        event.preventDefault();
        if (!canSubmit || isLoading) return;
        void onSubmit();
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit} aria-busy={isLoading}>
            {label && <label htmlFor={id} className={styles.label}>{label}</label>}
            <div className={styles.box}>
                <textarea
                    id={id}
                    ref={textareaRef}
                    className={styles.input}
                    rows={1}
                    placeholder="Most goals by 6ft Germans in the Champions League between 30-60mins"
                    aria-label={ariaLabel}
                    aria-describedby={[
                        (hint || isLoading) && `${id}-hint`,
                        message && `${id}-message`,
                    ].filter(Boolean).join(" ") || undefined}
                    autoComplete="off"
                    value={query}
                    maxLength={500}
                    onChange={event => onQueryChange(event.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={autosize}
                    disabled={isLoading}
                />
                {canSubmit && (
                    <button type="submit" className={`${styles.send} ${isLoading ? styles.loading : ""}`}
                        aria-label="Run search" disabled={isLoading}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            {isLoading ? <path d="M20 12a8 8 0 1 1-8-8" /> : <>
                                <path d="M12 19V5" />
                                <path d="M5 12l7-7 7 7" />
                            </>}
                        </svg>
                    </button>
                )}
            </div>
            {(hint || isLoading) && <p id={`${id}-hint`} className={styles.hint} role="status">
                {isLoading ? "Finding the right filters for your question…" : hint}
            </p>}
            {message && <p id={`${id}-message`} className={styles.message} role="alert">{message}</p>}
        </form>
    );
}
