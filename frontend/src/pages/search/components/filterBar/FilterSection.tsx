import React, {useState} from "react";

interface FilterSectionProps {
    title: string;
    children: React.ReactNode;
}

const FilterSection: React.FC<FilterSectionProps> = ({title, children}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="dropdown-section">
            <div className="dropdown-title" onClick={() => setIsOpen(!isOpen)}>
                <span className="title-text">{title}</span>
                <span className="arrow-icon">{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && children}
        </div>
    );
};

export default FilterSection;
