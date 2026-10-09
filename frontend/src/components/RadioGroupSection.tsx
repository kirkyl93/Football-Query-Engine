import React from "react";
import FilterSection from "./FilterSection";

interface RadioOption {
    name: string;
    id: string;
}

interface RadioGroupSectionProps {
    title: string;
    options: RadioOption[];
    selectedId: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Shared single-choice radio group used by PENALTIES and HOME OR AWAY. */
const RadioGroupSection: React.FC<RadioGroupSectionProps> = ({title, options, selectedId, onChange}) => {
    return (
        <FilterSection title={title}>
            <div className='radio-group'>
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
