import React, {useEffect, useState} from "react";
import {
    PlayerAppearance,
    PlayerStats,
    PlayerStreaks,
} from "../../../types/Player";
import {useAppearanceView, ZOOM_CHANGE_DEBOUNCE_MS} from "../hooks/useAppearanceView";
import {AppearancesChartView} from "./AppearancesChart";
import ExpandIcon from "../../../components/ExpandIcon";
import sectionStyles from './charts/ChartSections.module.css';
import ChartSectionModal from "./charts/ChartSectionModal";
import {
    buildStatDefs,
    FOCUS_BAR_HEIGHT,
    FOCUS_PIE_HEIGHT,
    STAT_GROUPS,
    StatDef,
    StatGroup,
} from "./statCharts";

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

/** Mini preview height: title-only chrome (comparison pies keep names). */
const MINI_HEIGHT = 130;

/**
 * Player charts: appearances (70%) beside streaks, with player and team
 * rows beneath. Every individual chart carries its own expand button
 * opening that chart fullscreen.
 *
 * Filter and zoom state lives here (one shared view per player), so the
 * tile previews, the fullscreen charts and the page-level stats all render
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
    const [focusStatId, setFocusStatId] = useState<string | null>(null);
    const [focusAppearance, setFocusAppearance] = useState<null | 'main' | 'comparison'>(null);
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

    const statDefs = buildStatDefs({
        playerName: playerLastName,
        comparisonPlayerName,
        stats,
        comparisonStats,
        playerStreaks,
        comparisonPlayerStreaks,
    });
    const defsById = new Map(statDefs.map((def) => [def.id, def]));
    const focusStat = focusStatId ? defsById.get(focusStatId) : undefined;

    const streakGroup = STAT_GROUPS.find((group) => group.id === 'streaks')!;
    const playerGroup = STAT_GROUPS.find((group) => group.id === 'player')!;
    const teamGroup = STAT_GROUPS.find((group) => group.id === 'team')!;

    // Previews carry the comparison too: bar hover tooltips name both
    // players, and comparison pies keep their names. Legends stay behind
    // the tile's expand action.
    const minisFor = (chartIds: string[]) =>
        chartIds.flatMap((id) => {
            const def = defsById.get(id);
            return def ? [<Mini key={def.id} def={def} onExpand={setFocusStatId} />] : [];
        });

    const sectionHead = (title: string, subtitle: string) => (
        <div className={sectionStyles['section-head']}>
            <div>
                <h3 className={sectionStyles['section-title']}>{title}</h3>
                <p className={sectionStyles['section-sub']}>{subtitle}</p>
            </div>
        </div>
    );

    return (
        <>
            <div className={sectionStyles['section-grid']}>
                <section aria-label="Appearances" className={`${sectionStyles['section-tile']} ${sectionStyles['tile-appearances']}`}>
                    {sectionHead(
                        'Appearances',
                        hasComparison ? `${playerLastName} vs ${comparisonPlayerName}` : 'Every game, minutes and events',
                    )}
                    <div className={sectionStyles['preview']}>
                        <AppearancesChartView
                            playerName={hasComparison ? playerLastName : ""}
                            view={mainView}
                            compact
                            onExpand={() => setFocusAppearance('main')}
                            expandLabel={`Expand ${playerLastName} full screen`}
                        />
                        {hasComparison && (
                            <>
                                <div
                                    aria-hidden="true"
                                    style={{borderTop: '1px solid var(--color-border)', margin: '12px 0 0'}}
                                />
                                <AppearancesChartView
                                    playerName={comparisonPlayerName}
                                    view={comparisonView}
                                    compact
                                    onExpand={() => setFocusAppearance('comparison')}
                                    expandLabel={`Expand ${comparisonPlayerName} full screen`}
                                />
                            </>
                        )}
                    </div>
                </section>
                <section aria-label={streakGroup.title} className={`${sectionStyles['section-tile']} ${sectionStyles['tile-streaks']}`}>
                    {sectionHead(streakGroup.title, streakGroup.subtitle)}
                    <div className={sectionStyles['preview']}>
                        <div className={sectionStyles['preview-card']}>
                            <div className={sectionStyles['minis']}>
                                {minisFor(streakGroup.chartIds)}
                            </div>
                        </div>
                    </div>
                </section>
                <section aria-label={playerGroup.title} className={`${sectionStyles['section-tile']} ${sectionStyles['tile-player']}`}>
                    {sectionHead(playerGroup.title, playerGroup.subtitle)}
                    <div className={sectionStyles['preview']}>
                        <div className={sectionStyles['preview-card']}>
                            <div className={sectionStyles['minis']}>
                                {minisFor(playerGroup.chartIds)}
                            </div>
                        </div>
                    </div>
                </section>
                <section aria-label={teamGroup.title} className={`${sectionStyles['section-tile']} ${sectionStyles['tile-team']}`}>
                    {sectionHead(teamGroup.title, teamGroup.subtitle)}
                    <div className={sectionStyles['preview']}>
                        <div className={sectionStyles['preview-card']}>
                            <div className={sectionStyles['minis']}>
                                {minisFor(teamGroup.chartIds)}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
            {focusStat && (
                <ChartSectionModal title={focusStat.title} onClose={() => setFocusStatId(null)}>
                    {focusStat.render(focusStat.kind === 'bar' ? FOCUS_BAR_HEIGHT : FOCUS_PIE_HEIGHT)}
                </ChartSectionModal>
            )}
            {focusAppearance && (
                <ChartSectionModal
                    title={focusAppearance === 'main' ? `Appearances — ${playerLastName}` : `Appearances — ${comparisonPlayerName}`}
                    onClose={() => setFocusAppearance(null)}
                >
                    <AppearancesChartView
                        playerName={""}
                        view={focusAppearance === 'main' ? mainView : comparisonView}
                    />
                </ChartSectionModal>
            )}
        </>
    );
};

/** Level-0 mini with its own fullscreen expand button. */
const Mini: React.FC<{ def: StatDef; onExpand: (id: string) => void }> = ({def, onExpand}) => (
    <div className={sectionStyles['mini-wrap']}>
        <button
            type="button"
            onClick={() => onExpand(def.id)}
            aria-label={`Expand ${def.title}`}
            title={`Expand ${def.title}`}
            className={sectionStyles['mini-expand']}
        >
            <ExpandIcon size={16} />
        </button>
        {def.render(MINI_HEIGHT)}
    </div>
);

export default PlayerChartsGrid;
