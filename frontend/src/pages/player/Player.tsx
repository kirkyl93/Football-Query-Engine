import React, {useEffect, useRef, useState} from "react";
import styles from './Player.module.css';

import {useParams} from "react-router-dom";
import {LoadingBar} from "../../components/LoadingBar";
import {
    createDefaultPlayerStats,
    createDefaultPlayerStreaks,
    PlayerAppearance, PlayerStats,
    PlayerStreaks,
} from "../../types/Player";
import {usePlayerData} from "./hooks/usePlayerData";
import {useComparisonPlayer} from "./hooks/useComparisonPlayer";
import {COMPARE_MIN_WIDTH_PX, useMediaQuery} from "./hooks/useMediaQuery";
import {calculatePlayerAndTeamStats} from "./lib/playerStatsCalculator";
import {calculatePlayerStreaks} from "./lib/playerStreakCalculator";
import PlayerInfoHeader from "./components/PlayerInfoHeader";
import PlayerComparisonBar from "./components/PlayerComparisonBar";
import PlayerChartsGrid from "./components/PlayerChartsGrid";

const Player: React.FC = () => {
    const {playerId} = useParams<{ playerId: string }>();
    const {playerData, playerGameData, loading, error} = usePlayerData(playerId);
    const {
        comparisonPlayerName,
        comparisonPlayer,
        comparisonPlayerGameData,
        zoomedComparisonPlayerGameData,
        setZoomedComparisonPlayerGameData,
        comparisonStats,
        setComparisonStats,
        comparisonLoading,
        comparisonError,
        selectComparisonPlayer,
        clearComparison,
    } = useComparisonPlayer(playerId);
    const [isCompareOpen, setIsCompareOpen] = useState(false);
    // Comparing needs two player headers side by side: unavailable on
    // narrow screens such as phones.
    const compareAllowed = useMediaQuery(`(min-width: ${COMPARE_MIN_WIDTH_PX}px)`);

    const [zoomedPlayerGameData, setZoomedPlayerGameData] = useState<PlayerAppearance[]>([]);
    const [playerStreaks, setPlayerStreaks] = useState<PlayerStreaks>(createDefaultPlayerStreaks);
    const [comparisonPlayerStreaks, setComparisonPlayerStreaks] = useState<PlayerStreaks>(createDefaultPlayerStreaks);
    const [stats, setStats] = useState<PlayerStats>(createDefaultPlayerStats);

    useEffect(() => {
        setPlayerStreaks(calculatePlayerStreaks(zoomedPlayerGameData));
        setStats(calculatePlayerAndTeamStats(zoomedPlayerGameData));
    }, [zoomedPlayerGameData]);

    useEffect(() => {
        setComparisonPlayerStreaks(calculatePlayerStreaks(zoomedComparisonPlayerGameData));
        setComparisonStats(calculatePlayerAndTeamStats(zoomedComparisonPlayerGameData));
    }, [zoomedComparisonPlayerGameData, setComparisonStats]);

    const handleClearComparison = () => {
        clearComparison();
        setComparisonPlayerStreaks(createDefaultPlayerStreaks());
    };

    const toggleCompare = () => {
        setIsCompareOpen((open) => !open);
    };

    const handleSelectComparison = (selectedId: number, selectedName: string) => {
        selectComparisonPlayer(selectedId, selectedName);
        setIsCompareOpen(false);
    };

    const compareRef = useRef<HTMLDivElement>(null);

    // Mirror the header search behaviour: outside click or Escape closes
    // the compare dropdown, and opening it focuses the search field.
    useEffect(() => {
        if (!isCompareOpen || comparisonPlayerName) {
            return;
        }
        const handleClickOutside = (event: MouseEvent) => {
            if (compareRef.current && !compareRef.current.contains(event.target as Node)) {
                setIsCompareOpen(false);
            }
        };
        const handleEscPress = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsCompareOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscPress);
        compareRef.current?.querySelector('input')?.focus();

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscPress);
        };
    }, [isCompareOpen, comparisonPlayerName]);

    if (loading || !playerData) {
        return <LoadingBar
            loading={loading}
            hasData={false}
            hasMore={true}
            error={error}
        />
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div className={styles['player-page-container']}>
            <div className={styles['player-info']}>
                <div className={styles['player-main']}>
                    <PlayerInfoHeader playerData={playerData} />
                </div>
                {compareAllowed ? (
                    <>
                        <div className={styles['player-compare-controls']}>
                            <div
                                ref={compareRef}
                                className={styles['compare-dropdown-wrapper']}
                            >
                                <button
                                    onClick={() => {
                                        if (comparisonPlayerName) {
                                            handleClearComparison();
                                        } else {
                                            toggleCompare();
                                        }
                                    }}
                                    aria-expanded={isCompareOpen}
                                    title={comparisonPlayerName ? "clear comparison" : "Compare player"}
                                    aria-label={comparisonPlayerName ? "clear comparison" : "Compare player"}
                                    className={styles['filter-button-player']}
                                >
                                    {comparisonPlayerName ? "clear comparison" : "compare player"}
                                </button>
                                {isCompareOpen && !comparisonPlayerName && (
                                    <div className={styles['compare-dropdown']}>
                                        <PlayerComparisonBar
                                            comparisonPlayerName={comparisonPlayerName}
                                            comparisonPlayer={comparisonPlayer}
                                            comparisonLoading={comparisonLoading}
                                            comparisonError={comparisonError}
                                            onSelectPlayerId={handleSelectComparison}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className={styles['player-comparison']}>
                            {comparisonPlayerName ? (
                                <PlayerComparisonBar
                                    comparisonPlayerName={comparisonPlayerName}
                                    comparisonPlayer={comparisonPlayer}
                                    comparisonLoading={comparisonLoading}
                                    comparisonError={comparisonError}
                                    onSelectPlayerId={handleSelectComparison}
                                />
                            ) : (
                                <div
                                    className={styles['player-comparison-empty']}
                                    aria-hidden="true"
                                />
                            )}
                        </div>
                    </>
                ) : null}
            </div>
            <PlayerChartsGrid
                playerLastName={playerData.last_name}
                playerDateOfBirth={playerData.date_of_birth}
                comparisonDateOfBirth={comparisonPlayer?.date_of_birth}
                playerGameData={playerGameData}
                comparisonPlayerName={comparisonPlayerName}
                comparisonPlayerGameData={comparisonPlayerGameData}
                comparisonEnabled={compareAllowed}
                stats={stats}
                comparisonStats={comparisonStats}
                playerStreaks={playerStreaks}
                comparisonPlayerStreaks={comparisonPlayerStreaks}
                onZoomChange={setZoomedPlayerGameData}
                onComparisonZoomChange={setZoomedComparisonPlayerGameData}
            />
        </div>
    )


};

export default Player;
