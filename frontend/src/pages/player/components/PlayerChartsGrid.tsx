import React, {useEffect, useState} from "react";
import {
    PlayerAppearance,
    PlayerStats,
    PlayerStreaks,
} from "../../../types/Player";
import {useAppearanceView, ZOOM_CHANGE_DEBOUNCE_MS} from "../hooks/useAppearanceView";
import {AppearancesChartView} from "./AppearancesChart";
import TeamStreakChart from "./TeamStreakChart";
import PlayerStreakChart from "./PlayerStreakChart";
import Per90Chart from "./Per90Chart";
import PlayerWinPercentageChart from "./PlayerWinPercentageChart";
import GoalsByGameChart from "./GoalsByGameChart";
import GoalAndAssistContributionChart from "./GoalAndAssistContributionChart";
import TeamGoalsByGameChart from "./TeamGoalsByGameChart";
import TeamGoalsConcededByGameChart from "./TeamGoalsConcededByGameChart";
import SubbedOnAndOffChart from "./SubbedOnAndOffChart";
import styles from '../Player.module.css';
import sectionStyles from './charts/ChartSections.module.css';
import AppearancesSectionModal from "./AppearancesSectionModal";
import StatsSectionModal, {STAT_GROUPS, StatGroup} from "./StatsSectionModal";

interface PlayerChartsGridProps {
    playerLastName: string;
    playerGameData: PlayerAppearance[];
    comparisonPlayerName: string;
    comparisonPlayerGameData: PlayerAppearance[];
    stats: PlayerStats;
    comparisonStats: PlayerStats;
    playerStreaks: PlayerStreaks;
    comparisonPlayerStreaks: PlayerStreaks;
    onZoomChange: (data: PlayerAppearance[]) => void;
    onComparisonZoomChange: (data: PlayerAppearance[]) => void;
    /** False on narrow screens, where comparing is unavailable. */
    comparisonEnabled: boolean;
}

type OpenSection = null | 'appearances' | StatGroup['id'];

/** Mini preview height: title-only chrome (no ticks or legends; comparison pies keep names). */
const MINI_HEIGHT = 130;

/**
 * Level 0 of the drill-down: appearances (70%) beside streaks, with player
 * and team rows beneath. Group tiles preview small title-only versions of
 * their charts; opening a tile shows its section modal.
 *
 * Filter and zoom state lives here (one shared view per player), so the
 * tile previews, the section modals and the page-level stats all render
 * the same window: changing filters anywhere updates every chart.
 */
const PlayerChartsGrid: React.FC<PlayerChartsGridProps> = ({
    playerLastName,
    playerGameData,
    comparisonPlayerName,
    comparisonPlayerGameData,
    stats,
    comparisonStats,
    playerStreaks,
    comparisonPlayerStreaks,
    onZoomChange,
    onComparisonZoomChange,
    comparisonEnabled,
}) => {
    const [openSection, setOpenSection] = useState<OpenSection>(null);
    const hasComparison = comparisonEnabled && comparisonPlayerGameData.length > 0;

    const mainView = useAppearanceView(playerGameData);
    const comparisonView = useAppearanceView(comparisonPlayerGameData);

    // Debounced fan-out: the page-level stats (and every chart derived
    // from them) follow the shared zoom window.
    useEffect(() => {
        const timer = setTimeout(() => onZoomChange(mainView.zoomedData), ZOOM_CHANGE_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [mainView.zoomedData, onZoomChange]);

    useEffect(() => {
        const timer = setTimeout(() => onComparisonZoomChange(comparisonView.zoomedData), ZOOM_CHANGE_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [comparisonView.zoomedData, onComparisonZoomChange]);

    const openGroup = STAT_GROUPS.find((group) => group.id === openSection);
    const streakGroup = STAT_GROUPS.find((group) => group.id === 'streaks')!;
    const playerGroup = STAT_GROUPS.find((group) => group.id === 'player')!;
    const teamGroup = STAT_GROUPS.find((group) => group.id === 'team')!;

    // Previews carry the comparison too: bar hover tooltips name both
    // players, and comparison pies keep their names. Legends stay behind
    // the tile's expand action.

    const sectionHead = (
        title: string,
        subtitle: string,
        section: OpenSection,
    ) => (
        <div className={sectionStyles['section-head']}>
            <div>
                <h3 className={sectionStyles['section-title']}>{title}</h3>
                <p className={sectionStyles['section-sub']}>{subtitle}</p>
            </div>
            <button
                type="button"
                onClick={() => setOpenSection(section)}
                aria-haspopup="dialog"
                className={styles['filter-button-player']}
            >
                Open ⤢
            </button>
        </div>
    );

    return (
        <>
            <div className={sectionStyles['section-grid']}>
                <section aria-label="Appearances" className={`${sectionStyles['section-tile']} ${sectionStyles['tile-appearances']}`}>
                    {sectionHead(
                        'Appearances',
                        hasComparison
                            ? `You vs ${comparisonPlayerName} — open for side-by-side`
                            : 'Every game, minutes and events',
                        'appearances',
                    )}
                    <div className={sectionStyles['preview']} aria-hidden="true">
                        <AppearancesChartView playerName={""} view={mainView} compact />
                        {hasComparison && (
                            <>
                                <div
                                    aria-hidden="true"
                                    style={{borderTop: '1px solid var(--color-border)', margin: '12px 0 0'}}
                                />
                                <AppearancesChartView playerName={""} view={comparisonView} compact />
                            </>
                        )}
                    </div>
                </section>
                <section aria-label={streakGroup.title} className={`${sectionStyles['section-tile']} ${sectionStyles['tile-streaks']}`}>
                    {sectionHead(streakGroup.title, streakGroup.subtitle, streakGroup.id)}
                    <div className={sectionStyles['preview']} aria-hidden="true">
                        <div className={sectionStyles['preview-card']}>
                            <div className={sectionStyles['minis']}>
                                <TeamStreakChart
                                    playerName={playerLastName}
                                    playerStreaks={playerStreaks}
                                    comparisonPlayerName={comparisonPlayerName}
                                    comparisonPlayerStreaks={comparisonPlayerStreaks}
                                    height={MINI_HEIGHT}
                                />
                                <PlayerStreakChart
                                    playerName={playerLastName}
                                    playerStreaks={playerStreaks}
                                    comparisonPlayerName={comparisonPlayerName}
                                    comparisonPlayerStreaks={comparisonPlayerStreaks}
                                    height={MINI_HEIGHT}
                                />
                            </div>
                        </div>
                    </div>
                </section>
                <section aria-label={playerGroup.title} className={`${sectionStyles['section-tile']} ${sectionStyles['tile-player']}`}>
                    {sectionHead(playerGroup.title, playerGroup.subtitle, playerGroup.id)}
                    <div className={sectionStyles['preview']} aria-hidden="true">
                        <div className={sectionStyles['preview-card']}>
                            <div className={sectionStyles['minis']}>
                                <Per90Chart
                                    playerName={playerLastName}
                                    playerStats={stats}
                                    comparisonPlayerName={comparisonPlayerName}
                                    comparisonPlayerStats={comparisonStats}
                                    height={MINI_HEIGHT}
                                />
                                <GoalsByGameChart
                                    playerName={playerLastName}
                                    goalsByGame={stats.playerGoalsByGame}
                                    comparisonPlayerName={comparisonPlayerName}
                                    comparisonGoalsByGame={comparisonStats.playerGoalsByGame}
                                    height={MINI_HEIGHT}
                                />
                                <GoalAndAssistContributionChart
                                    playerName={playerLastName}
                                    nonPenaltyGoals={stats.totalPlayerGoalsExcludingPenalties}
                                    penaltyGoals={stats.totalPenalties}
                                    assists={stats.totalPlayerAssists}
                                    totalTeamGoals={stats.totalTeamGoals}
                                    comparisonPlayerName={comparisonPlayerName}
                                    comparisonNonPenaltyGoals={comparisonStats.totalPlayerGoalsExcludingPenalties}
                                    comparisonPenaltyGoals={comparisonStats.totalPenalties}
                                    comparisonAssists={comparisonStats.totalPlayerAssists}
                                    comparisonTotalTeamGoals={comparisonStats.totalTeamGoals}
                                    height={MINI_HEIGHT}
                                />
                                <SubbedOnAndOffChart
                                    playerName={playerLastName}
                                    startedAndFinished={stats.gamesStartedAndFinished}
                                    startedAndSubbed={stats.gamesStartedAndSubbedOff}
                                    subbedOnAndOff={stats.gamesSubbedOnAndSubbedOff}
                                    subbedOnAndFinished={stats.gamesSubbedOnAndFinished}
                                    comparisonPlayerName={comparisonPlayerName}
                                    comparisonStartedAndFinished={comparisonStats.gamesStartedAndFinished}
                                    comparisonStartedAndSubbed={comparisonStats.gamesStartedAndSubbedOff}
                                    comparisonSubbedOnAndOff={comparisonStats.gamesSubbedOnAndSubbedOff}
                                    comparisonSubbedOnAndFinished={comparisonStats.gamesSubbedOnAndFinished}
                                    height={MINI_HEIGHT}
                                />
                            </div>
                        </div>
                    </div>
                </section>
                <section aria-label={teamGroup.title} className={`${sectionStyles['section-tile']} ${sectionStyles['tile-team']}`}>
                    {sectionHead(teamGroup.title, teamGroup.subtitle, teamGroup.id)}
                    <div className={sectionStyles['preview']} aria-hidden="true">
                        <div className={sectionStyles['preview-card']}>
                            <div className={sectionStyles['minis']}>
                                <PlayerWinPercentageChart
                                    playerName={playerLastName}
                                    wins={stats.totalWins}
                                    draws={stats.totalDraws}
                                    losses={stats.totalLosses}
                                    comparisonPlayerName={comparisonPlayerName}
                                    comparisonWins={comparisonStats.totalWins}
                                    comparisonDraws={comparisonStats.totalDraws}
                                    comparisonLosses={comparisonStats.totalLosses}
                                    height={MINI_HEIGHT}
                                />
                                <TeamGoalsByGameChart
                                    playerName={playerLastName}
                                    teamGoalsByGame={stats.teamGoalsByGame}
                                    comparisonPlayerName={comparisonPlayerName}
                                    comparisonTeamGoalsByGame={comparisonStats.teamGoalsByGame}
                                    height={MINI_HEIGHT}
                                />
                                <TeamGoalsConcededByGameChart
                                    playerName={playerLastName}
                                    teamGoalsConcededByGame={stats.teamGoalsConcededByGame}
                                    comparisonPlayerName={comparisonPlayerName}
                                    comparisonTeamGoalsConcededByGame={comparisonStats.teamGoalsConcededByGame}
                                    height={MINI_HEIGHT}
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
            {openSection === 'appearances' && (
                <AppearancesSectionModal
                    mainLabel={playerLastName}
                    mainView={mainView}
                    comparisonLabel={comparisonPlayerName}
                    comparisonView={comparisonView}
                    hasComparison={hasComparison}
                    onClose={() => setOpenSection(null)}
                />
            )}
            {openGroup && (
                <StatsSectionModal
                    title={openGroup.title}
                    chartIds={openGroup.chartIds}
                    playerName={playerLastName}
                    comparisonPlayerName={comparisonPlayerName}
                    stats={stats}
                    comparisonStats={comparisonStats}
                    playerStreaks={playerStreaks}
                    comparisonPlayerStreaks={comparisonPlayerStreaks}
                    onClose={() => setOpenSection(null)}
                />
            )}
        </>
    );
};

export default PlayerChartsGrid;
