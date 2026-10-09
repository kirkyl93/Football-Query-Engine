import React, {useEffect, useState} from "react";
import './Player.css';

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
        comparisonPlayerGameData,
        zoomedComparisonPlayerGameData,
        setZoomedComparisonPlayerGameData,
        comparisonStats,
        setComparisonStats,
        handleSelectPlayer,
        clearComparison,
    } = useComparisonPlayer(playerId);

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
        <div className="player-page-container">
            <div className={"player-info"}>
                <PlayerInfoHeader playerData={playerData} />
                <PlayerComparisonBar
                    comparisonPlayerName={comparisonPlayerName}
                    onSelectPlayer={handleSelectPlayer}
                    onClearComparison={handleClearComparison}
                />
            </div>
            <PlayerChartsGrid
                playerLastName={playerData.last_name}
                playerGameData={playerGameData}
                comparisonPlayerName={comparisonPlayerName}
                comparisonPlayerGameData={comparisonPlayerGameData}
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
