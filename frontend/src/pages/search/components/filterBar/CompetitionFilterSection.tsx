import React, {useState} from "react";
import {competitions} from "../../../../data/Competitions";
import FilterSection from "../../../../components/FilterSection";

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
        <FilterSection title="COMPETITIONS">
            <div>
                <div className="sub-dropdown-title" onClick={() => setIsLeaguesOpen(!isLeaguesOpen)}>
                    <span className="title-text">DOMESTIC</span>
                    <span className="arrow-icon">{isLeaguesOpen ? '▲' : '▼'}</span>
                </div>
                {isLeaguesOpen && (
                    <div className="checkbox-group-vertical">
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
                                    className="flag-icon"
                                />
                                {league.name}
                            </label>
                        ))}
                    </div>
                )}

                <div className="sub-dropdown-title"
                     onClick={() => setIsEuropeanCompetitionsOpen(!isEuropeanCompetitionsOpen)}>
                    <span className="title-text">EUROPE</span>
                    <span className="arrow-icon">{isEuropeanCompetitionsOpen ? '▲' : '▼'}</span>
                </div>
                {isEuropeanCompetitionsOpen && (
                    <div className="checkbox-group-vertical">
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
                                    className="flag-icon"
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
