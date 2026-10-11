import React, {useState} from "react";
import {AppearancesChartView} from "./AppearancesChart";
import {AppearanceView} from "../hooks/useAppearanceView";
import ChartSectionModal from "./charts/ChartSectionModal";
import sectionStyles from './charts/ChartSections.module.css';
import playerStyles from '../Player.module.css';

interface AppearancesSectionModalProps {
    mainLabel: string;
    mainView: AppearanceView;
    comparisonLabel: string;
    comparisonView: AppearanceView;
    hasComparison: boolean;
    onClose: () => void;
}

/**
 * Appearances drill-down (level 1): a single full chart when alone,
 * side-by-side panes when comparing. Both panes render the shared views
 * from the grid, so filters apply everywhere at once. Expanding one pane
 * switches the panel layout instead of mounting a new chart, so both
 * instances stay mounted (hidden panes use display:none) and keep
 * filter/zoom state.
 */
const AppearancesSectionModal: React.FC<AppearancesSectionModalProps> = ({
    mainLabel,
    mainView,
    comparisonLabel,
    comparisonView,
    hasComparison,
    onClose,
}) => {
    const [focus, setFocus] = useState<null | 'main' | 'comparison'>(null);
    const showMain = focus === null || focus === 'main';
    const showComparison = hasComparison && (focus === null || focus === 'comparison');
    const sideBySide = hasComparison && focus === null;

    const expandButton = (
        label: string,
        onExpand: () => void,
        title: string,
    ) => (
        <button
            type="button"
            onClick={onExpand}
            aria-label={label}
            title={title}
            className={sectionStyles['mini-expand']}
            style={{position: 'static'}}
        >
            ⤢
        </button>
    );

    return (
        <ChartSectionModal title="Appearances" onClose={onClose}>
            {hasComparison && focus !== null && (
                <div className={sectionStyles['back-row']}>
                    <button
                        type="button"
                        onClick={() => setFocus(null)}
                        className={playerStyles['filter-button-player']}
                    >
                        ← Back to side-by-side
                    </button>
                </div>
            )}
            <div className={sideBySide ? sectionStyles['compare-grid'] : undefined}>
                <div className={showMain ? sectionStyles['pane'] : sectionStyles['pane-hidden']}>
                    {hasComparison && (
                        <div className={sectionStyles['pane-head']}>
                            <span className={sectionStyles['pane-name']}>{mainLabel}</span>
                            {focus === null && expandButton(
                                `Expand ${mainLabel} appearances`,
                                () => setFocus('main'),
                                `Expand ${mainLabel} only`,
                            )}
                        </div>
                    )}
                    <AppearancesChartView playerName={""} view={mainView} fillHeight />
                </div>
                {hasComparison && (
                    <div className={showComparison ? sectionStyles['pane'] : sectionStyles['pane-hidden']}>
                        <div className={sectionStyles['pane-head']}>
                            <span className={sectionStyles['pane-name']}>{comparisonLabel}</span>
                            {focus === null && expandButton(
                                `Expand ${comparisonLabel} appearances`,
                                () => setFocus('comparison'),
                                `Expand ${comparisonLabel} only`,
                            )}
                        </div>
                        <AppearancesChartView playerName={""} view={comparisonView} fillHeight />
                    </div>
                )}
            </div>
        </ChartSectionModal>
    );
};

export default AppearancesSectionModal;
