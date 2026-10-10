import React, {useState} from "react";
import {competitions} from "../../../../data/Competitions";
import FilterSection from "../../../../components/FilterSection";
import {competitionSummary} from "../../lib/filterSummaries";
import shared from '../../../../styles/shared.module.css';

interface CompetitionFilterSectionProps {
    selectedCompetitions: string[];
    onCompetitionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CompetitionFilterSection: React.FC<CompetitionFilterSectionProps> = ({
    selectedCompetitions,
    onCompetitionChange,
}) => {
    const [isLeaguesOpen, setIsLeaguesOpen] = useState(false);
    const [isEuropeanCompetitionsOpen, setIsEuropeanCompetitionsOpen] = useState(false);

    return (
        <FilterSection title="COMPETITIONS" summary={competitionSummary(selectedCompetitions)}>
            <div>
                <div className={shared['sub-dropdown-title']} onClick={() => setIsLeaguesOpen(!isLeaguesOpen)}>
                    <span className={shared['title-text']}>DOMESTIC</span>
                    <span className={shared['arrow-icon']}>{isLeaguesOpen ? '▲' : '▼'}</span>
                </div>
                {isLeaguesOpen && (
                    <div className={shared['checkbox-group-vertical']}>
                        {competitions.leagues.map(league => (
                            <label className="competition-label" key={league.competitionId}>
                                <input
                                    type="checkbox"
                                    value={league.competitionId}
                                    checked={selectedCompetitions.includes(league.competitionId)}
                                    onChange={onCompetitionChange}
                                />
                                <img
                                    src={`https://flagcdn.com/w20/${league.countryCode}.png`}
                                    alt={league.name}
                                    className={shared['flag-icon']}
                                />
                                {league.name}
                            </label>
                        ))}
                    </div>
                )}

                <div className={shared['sub-dropdown-title']}
                     onClick={() => setIsEuropeanCompetitionsOpen(!isEuropeanCompetitionsOpen)}>
                    <span className={shared['title-text']}>EUROPE</span>
                    <span className={shared['arrow-icon']}>{isEuropeanCompetitionsOpen ? '▲' : '▼'}</span>
                </div>
                {isEuropeanCompetitionsOpen && (
                    <div className={shared['checkbox-group-vertical']}>
                        {competitions.europeanCompetitions.map(competition => (
                            <label className="competition-label" key={competition.competitionId}>
                                <input
                                    type='checkbox'
                                    value={competition.competitionId}
                                    checked={selectedCompetitions.includes(competition.competitionId)}
                                    onChange={onCompetitionChange}
                                />
                                <img
                                    src={`https://tmssl.akamaized.net/images/logo/header/${encodeURIComponent(competition.competitionId.toLowerCase())}.png`}
                                    alt={competition.name}
                                    className={shared['flag-icon']}
                                />
                                {competition.name}
                            </label>
                        ))}
                    </div>
                )}
            </div>
        </FilterSection>
    );
};

export default CompetitionFilterSection;
