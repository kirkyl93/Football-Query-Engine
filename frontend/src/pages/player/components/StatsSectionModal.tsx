import React, {useState} from "react";
import {PlayerStats, PlayerStreaks} from "../../../types/Player";
import ChartSectionModal from "./charts/ChartSectionModal";
import TeamStreakChart from "./TeamStreakChart";
import PlayerStreakChart from "./PlayerStreakChart";
import Per90Chart from "./Per90Chart";
import PlayerWinPercentageChart from "./PlayerWinPercentageChart";
import GoalsByGameChart from "./GoalsByGameChart";
import GoalAndAssistContributionChart from "./GoalAndAssistContributionChart";
import TeamGoalsByGameChart from "./TeamGoalsByGameChart";
import TeamGoalsConcededByGameChart from "./TeamGoalsConcededByGameChart";
import SubbedOnAndOffChart from "./SubbedOnAndOffChart";
import sectionStyles from './charts/ChartSections.module.css';
import playerStyles from '../Player.module.css';

const GRID_BAR_HEIGHT = 300;
const GRID_PIE_HEIGHT = 260;
const FOCUS_BAR_HEIGHT = 480;
const FOCUS_PIE_HEIGHT = 340;

interface StatsSectionModalProps {
    title?: string;
    chartIds?: string[];
    playerName: string;
    comparisonPlayerName: string;
    stats: PlayerStats;
    comparisonStats: PlayerStats;
    playerStreaks: PlayerStreaks;
    comparisonPlayerStreaks: PlayerStreaks;
    onClose: () => void;
}

interface StatDef {
    id: string;
    title: string;
    kind: 'bar' | 'pie';
    render: (height: number) => React.ReactNode;
}

/**
 * Level-0 stat groups: streaks, player and team tiles each open this modal
 * scoped to their charts.
 */
export interface StatGroup {
    id: 'streaks' | 'player' | 'team';
    title: string;
    subtitle: string;
    chartIds: string[];
}

export const STAT_GROUPS: StatGroup[] = [    {
        id: 'streaks',
        title: 'Streak charts',
        subtitle: 'Consecutive games, team and player',
        chartIds: ['team-streaks', 'player-streaks'],
    },
    {
        id: 'player',
        title: 'Player charts',
        subtitle: 'Per-90, goals and appearances',
        chartIds: ['per90', 'goals-by-game', 'goal-contribution', 'appearance-type'],
    },
    {
        id: 'team',
        title: 'Team charts',
        subtitle: 'Results and goals with you in the side',
        chartIds: ['win-pct', 'team-goals', 'team-conceded'],
    },
];

/**
 * Stats drill-down (level 1): the group's charts in a grid; expanding one
 * swaps the panel to that single chart. Small charts are stateless
 * (pure functions of props), so re-rendering at a larger height loses
 * nothing.
 */
const StatsSectionModal: React.FC<StatsSectionModalProps> = ({
    title = 'Stat charts',
    chartIds,
    playerName,
    comparisonPlayerName,
    stats,
    comparisonStats,
    playerStreaks,
    comparisonPlayerStreaks,
    onClose,
}) => {
    const [focus, setFocus] = useState<string | null>(null);

    const defs: StatDef[] = [
        {
            id: 'team-streaks', title: 'Team streaks', kind: 'bar',
            render: (height) => (
                <TeamStreakChart
                    playerName={playerName}
                    playerStreaks={playerStreaks}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonPlayerStreaks={comparisonPlayerStreaks}
                    height={height}
                />
            ),
        },
        {
            id: 'player-streaks', title: 'Player streaks', kind: 'bar',
            render: (height) => (
                <PlayerStreakChart
                    playerName={playerName}
                    playerStreaks={playerStreaks}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonPlayerStreaks={comparisonPlayerStreaks}
                    height={height}
                />
            ),
        },
        {
            id: 'per90', title: 'Per 90', kind: 'bar',
            render: (height) => (
                <Per90Chart
                    playerName={playerName}
                    playerStats={stats}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonPlayerStats={comparisonStats}
                    height={height}
                />
            ),
        },
        {
            id: 'win-pct', title: 'Win percentage', kind: 'pie',
            render: (height) => (
                <PlayerWinPercentageChart
                    playerName={playerName}
                    wins={stats.totalWins}
                    draws={stats.totalDraws}
                    losses={stats.totalLosses}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonWins={comparisonStats.totalWins}
                    comparisonDraws={comparisonStats.totalDraws}
                    comparisonLosses={comparisonStats.totalLosses}
                    height={height}
                />
            ),
        },
        {
            id: 'goals-by-game', title: 'Goals by game', kind: 'pie',
            render: (height) => (
                <GoalsByGameChart
                    playerName={playerName}
                    goalsByGame={stats.playerGoalsByGame}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonGoalsByGame={comparisonStats.playerGoalsByGame}
                    height={height}
                />
            ),
        },
        {
            id: 'goal-contribution', title: 'Team goals contributed to', kind: 'pie',
            render: (height) => (
                <GoalAndAssistContributionChart
                    playerName={playerName}
                    nonPenaltyGoals={stats.totalPlayerGoalsExcludingPenalties}
                    penaltyGoals={stats.totalPenalties}
                    assists={stats.totalPlayerAssists}
                    totalTeamGoals={stats.totalTeamGoals}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonNonPenaltyGoals={comparisonStats.totalPlayerGoalsExcludingPenalties}
                    comparisonPenaltyGoals={comparisonStats.totalPenalties}
                    comparisonAssists={comparisonStats.totalPlayerAssists}
                    comparisonTotalTeamGoals={comparisonStats.totalTeamGoals}
                    height={height}
                />
            ),
        },
        {
            id: 'team-goals', title: 'Team goals by game', kind: 'pie',
            render: (height) => (
                <TeamGoalsByGameChart
                    playerName={playerName}
                    teamGoalsByGame={stats.teamGoalsByGame}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonTeamGoalsByGame={comparisonStats.teamGoalsByGame}
                    height={height}
                />
            ),
        },
        {
            id: 'team-conceded', title: 'Team goals conceded by game', kind: 'pie',
            render: (height) => (
                <TeamGoalsConcededByGameChart
                    playerName={playerName}
                    teamGoalsConcededByGame={stats.teamGoalsConcededByGame}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonTeamGoalsConcededByGame={comparisonStats.teamGoalsConcededByGame}
                    height={height}
                />
            ),
        },
        {
            id: 'appearance-type', title: 'Appearance by type', kind: 'pie',
            render: (height) => (
                <SubbedOnAndOffChart
                    playerName={playerName}
                    startedAndFinished={stats.gamesStartedAndFinished}
                    startedAndSubbed={stats.gamesStartedAndSubbedOff}
                    subbedOnAndOff={stats.gamesSubbedOnAndSubbedOff}
                    subbedOnAndFinished={stats.gamesSubbedOnAndFinished}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonStartedAndFinished={comparisonStats.gamesStartedAndFinished}
                    comparisonStartedAndSubbed={comparisonStats.gamesStartedAndSubbedOff}
                    comparisonSubbedOnAndOff={comparisonStats.gamesSubbedOnAndSubbedOff}
                    comparisonSubbedOnAndFinished={comparisonStats.gamesSubbedOnAndFinished}
                    height={height}
                />
            ),
        },
    ];

    const focused = defs.find((def) => def.id === focus);
    const visible = chartIds ? defs.filter((def) => chartIds.includes(def.id)) : defs;

    return (
        <ChartSectionModal title={title} onClose={onClose}>
            {focused ? (
                <>
                    <div className={sectionStyles['back-row']}>
                        <button
                            type="button"
                            onClick={() => setFocus(null)}
                            className={playerStyles['filter-button-player']}
                        >
                            ← Back to {title.toLowerCase()}
                        </button>
                    </div>
                    {focused.render(focused.kind === 'bar' ? FOCUS_BAR_HEIGHT : FOCUS_PIE_HEIGHT)}
                </>
            ) : (
                <div className={sectionStyles['stats-grid']}>
                    {visible.map((def) => (
                        <div key={def.id} className={sectionStyles['mini-card']}>
                            <button
                                type="button"
                                onClick={() => setFocus(def.id)}
                                aria-label={`Expand ${def.title}`}
                                title={`Expand ${def.title}`}
                                className={sectionStyles['mini-expand']}
                            >
                                ⤢
                            </button>
                            {def.render(def.kind === 'bar' ? GRID_BAR_HEIGHT : GRID_PIE_HEIGHT)}
                        </div>
                    ))}
                </div>
            )}
        </ChartSectionModal>
    );
};

export default StatsSectionModal;
