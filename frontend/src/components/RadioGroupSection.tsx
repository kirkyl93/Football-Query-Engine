import React from "react";
import FilterSection from "./FilterSection";
import shared from "../styles/shared.module.css";

interface RadioOption {
    name: string;
    id: string;
}

interface RadioGroupSectionProps {
    title: string;
    options: RadioOption[];
    selectedId: string;
    defaultId?: string;
    showDefaultSummary?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Shared single-choice radio group used by PENALTIES and HOME OR AWAY. */
const RadioGroupSection: React.FC<RadioGroupSectionProps> = ({title, options, selectedId, defaultId, showDefaultSummary, onChange}) => {
    const summary = !defaultId || showDefaultSummary || selectedId !== defaultId
        ? options.find((option) => option.id === selectedId)?.name
        : undefined;
    return (
        <FilterSection
            title={title}
            summary={summary}
        >
            <div className={shared['radio-group']}>
                {options.map(option => (
                    <label key={option.id}>
                        <input
                            type="radio"
                            value={option.id}
                            checked={selectedId === option.id}
                            onChange={onChange}
                        />
                        {option.name}
                    </label>
                ))}
            </div>
        </FilterSection>
    );
};

export default RadioGroupSection;
