import React, {useState} from "react";
import {competitions} from "../../../../data/Competitions";
import FilterSection from "../../../../components/FilterSection";
import shared from '../../../../styles/shared.module.css';

interface PlayerCompetitionSectionProps {
    leagueCompetitions: string[];
    europeanCompetitions: string[];
    selectedCompetitions: string[];
    onCompetitionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PlayerCompetitionSection: React.FC<PlayerCompetitionSectionProps> = ({
    leagueCompetitions,
    europeanCompetitions,
    selectedCompetitions,
    onCompetitionChange,
}) => {
    const [isLeaguesOpen, setIsLeaguesOpen] = useState(false);
    const [isEuropeanCompetitionsOpen, setIsEuropeanCompetitionsOpen] = useState(false);

    return (
        <FilterSection title="COMPETITIONS">
            <div>
                {leagueCompetitions.length > 0 && (
                    <div className={shared['sub-dropdown-title']} onClick={() => setIsLeaguesOpen(!isLeaguesOpen)}>
                        <span className={shared['title-text']}>DOMESTIC</span>
                        <span className={shared['arrow-icon']}>{isLeaguesOpen ? '▲' : '▼'}</span>
                    </div>
                )}
                {isLeaguesOpen && leagueCompetitions.length > 0 && (
                    <div className={shared['checkbox-group-vertical']}>
                        {leagueCompetitions.map(league => {
                            const leagueComp = competitions.leagues.find(comp => comp.name === league);
                            if (!leagueComp) {
                                return;
                            }
                            return (
                                <label className="competition-label" key={leagueComp.competitionId}>
                                    <input
                                        type="checkbox"
                                        value={leagueComp.name}
                                        checked={selectedCompetitions.includes(leagueComp.name)}
                                        onChange={onCompetitionChange}
                                    />
                                    <img
                                        src={`https://flagcdn.com/w20/${leagueComp.countryCode}.png`}
                                        alt={leagueComp.name}
                                        className={shared['flag-icon']}
                                    />
                                    {leagueComp.name}
                                </label>
                            )
                        })}
                    </div>
                )}

                {europeanCompetitions.length > 0 && (
                    <div className={shared['sub-dropdown-title']}
                         onClick={() => setIsEuropeanCompetitionsOpen(!isEuropeanCompetitionsOpen)}>
                        <span className={shared['title-text']}>EUROPE</span>
                        <span className={shared['arrow-icon']}>{isEuropeanCompetitionsOpen ? '▲' : '▼'}</span>
                    </div>
                )}
                {isEuropeanCompetitionsOpen && europeanCompetitions.length > 0 && (
                    <div className={shared['checkbox-group-vertical']}>
                        {europeanCompetitions.map(comp => {
                            const europeComp = competitions.europeanCompetitions.find(euroComp => euroComp.name === comp);
                            if (!europeComp) {
                                return;
                            }
                            return (
                                <label className="competition-label" key={europeComp.competitionId}>
                                    <input
                                        type='checkbox'
                                        value={europeComp.name}
                                        checked={selectedCompetitions.includes(europeComp.name)}
                                        onChange={onCompetitionChange}
                                    />
                                    <img
                                        src={`https://tmssl.akamaized.net/images/logo/header/${encodeURIComponent(europeComp.competitionId.toLowerCase())}.png`}
                                        alt={europeComp.name}
                                        className={shared['flag-icon']}
                                    />
                                    {europeComp.name}
                                </label>
                            )
                        })}
                    </div>
                )}
            </div>
        </FilterSection>
    );
};

export default PlayerCompetitionSection;
