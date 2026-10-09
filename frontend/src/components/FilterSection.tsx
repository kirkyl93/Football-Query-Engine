import React, {useState} from "react";
import shared from "../styles/shared.module.css";

interface FilterSectionProps {
    title: string;
    children: React.ReactNode;
}

const FilterSection: React.FC<FilterSectionProps> = ({title, children}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={shared['dropdown-section']}>
            <div className={shared['dropdown-title']} onClick={() => setIsOpen(!isOpen)}>
                <span className={shared['title-text']}>{title}</span>
                <span className={shared['arrow-icon']}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && children}
        </div>
    );
};

export default FilterSection;
