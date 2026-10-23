import React from "react";
import styles from "./SupportedInfo.module.css";
import {competitions} from "../../../data/Competitions";

const supportedTiles = [
    {
        title: "Seasons",
        body: "Every season from 1992/93 to 2025/26. Search one season or combine several.",
    },
    {
        title: "Rankings",
        body: "Goals, assists, appearances, minutes and cards. Compare totals or minutes per event, or count games and seasons that meet your criteria.",
    },
    {
        title: "Filters",
        body: "Combine nationality, position, age and height with match time, penalties and home or away games. Age is measured on the match date, not today.",
    },
    {
        title: "In the filter menu",
        body: "Also filter by clubs played for or against, substitute appearances and time brought on.",
    },
];

const SupportedInfo: React.FC = () => {
    return (
        <section className={styles['supported']} aria-label="What queries are supported">
            <h2 className={styles['supported-heading']}>Stats, filters &amp; coverage</h2>
            <ul className={styles['supported-tiles']}>
                {supportedTiles.map(tile => (
                    <li key={tile.title} className={styles['supported-tile']}>
                        <h3 className={styles['supported-tile-title']}>{tile.title}</h3>
                        <p className={styles['supported-tile-body']}>{tile.body}</p>
                    </li>
                ))}
            </ul>

            <details className={styles['coverage']}>
                <summary>
                    Competitions covered
                    <span className={styles['coverage-count']}>{competitions.leagues.length} leagues · {competitions.europeanCompetitions.length} European competitions</span>
                </summary>
                <div className={styles['coverage-groups']}>
                    <div>
                        <h3 className={styles['supported-tile-title']}>Leagues</h3>
                        <ul className={`${styles['supported-competitions']} ${styles['league-competitions']}`}>
                            {competitions.leagues.map(league => (
                                <li key={league.competitionId}>{league.name}</li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className={styles['supported-tile-title']}>European competitions</h3>
                        <ul className={`${styles['supported-competitions']} ${styles['european-competitions']}`}>
                            {competitions.europeanCompetitions.map(competition => (
                                <li key={competition.competitionId}>{competition.name}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </details>
        </section>
    );
};

export default SupportedInfo;
