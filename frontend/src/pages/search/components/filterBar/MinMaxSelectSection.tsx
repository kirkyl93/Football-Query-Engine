import React from "react";
import FilterSection from "./FilterSection";

interface MinMaxSelectSectionProps {
    title: string;
    options: number[];
    minLabel: string;
    maxLabel: string;
    minValue?: number;
    maxValue?: number;
    onMinChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onMaxChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

/** Shared min/max dropdown pair used by MINUTES, AGE and HEIGHT. */
const MinMaxSelectSection: React.FC<MinMaxSelectSectionProps> = ({
    title,
    options,
    minLabel,
    maxLabel,
    minValue,
    maxValue,
    onMinChange,
    onMaxChange,
}) => {
    return (
        <FilterSection title={title}>
            <div className="minute-and-age-and-sub-dropdown-group">
                <label>{minLabel}</label>
                <select value={minValue ?? ''} onChange={onMinChange}>
                    <option value="">Any</option>
                    {options.map(option => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>

                <label>{maxLabel}</label>
                <select value={maxValue ?? ''} onChange={onMaxChange}>
                    <option value="">Any</option>
                    {options.map(option => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
            </div>
        </FilterSection>
    );
};

export default MinMaxSelectSection;
