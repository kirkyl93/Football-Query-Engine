import React, {useEffect, useState} from "react";
import './Player.css';

import {useParams} from "react-router-dom";
import {convertDateStringToDate, dateFormatter} from "../../lib/DateUtils";
import {LoadingBar} from "../../components/LoadingBar";
import {AppearancesChart} from "./components/AppearancesChart";
import { PlayerAppearance, Player } from "../../types/Player";

const Player: React.FC = () => {
    const {playerId} = useParams<{ playerId: string }>();
    const [playerData, setPlayerData] = useState<Player | null>(null);
    const [zoomedData, setZoomedData] = useState<PlayerAppearance[]>([]);
    const [playerGameData, setPlayerGameData] = useState<PlayerAppearance[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlayerData = async () => {
            setLoading(true);
            try {
                const [playerResponse, playerGameDataResponse] = await Promise.all([
                    fetch(`http://localhost:8080/players/${playerId}`),
                    fetch(`http://localhost:8080/players/${playerId}/games`)
                ]);

                if (!playerResponse.ok || !playerGameDataResponse.ok) {
                    throw new Error('Network response was not ok');
                }

                const playerData: Player[] = await playerResponse.json();
                const playerGameData: PlayerAppearance[] = await playerGameDataResponse.json();

                setPlayerData(playerData[0]);
                setPlayerGameData(playerGameData);
            } catch (error) {
                setError('Failed to fetch player data');
            } finally {
                setLoading(false);
            }
        };
        fetchPlayerData();
    }, [playerId]);

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
                <div style={{fontWeight: "800", fontSize: "14"}}>
                    <img
                        src={playerData?.image_url}
                        alt={playerData?.first_name + " " + playerData?.last_name}
                        width="95"
                        style={{borderRadius: '25%', marginRight: "10px"}}
                    />
                </div>
                <div>
                    <h3>{playerData?.first_name + " " + playerData?.last_name}</h3>
                    <p>
                        Nation:
                        <img
                            className="second-gs-columns-to-hide"
                            src={`https://flagicons.lipis.dev/flags/4x3/${playerData?.country_code}.svg`}
                            alt={`${playerData?.country_code}`}
                            style={{width: '17px', height: '13px', marginRight: '5px', marginLeft: '5px'}}
                        />
                        {playerData?.country_of_citizenship}
                    </p>
                    <p>
                        Date of
                        birth: {dateFormatter.format(convertDateStringToDate(playerData?.date_of_birth || ""))}<span
                        style={{fontWeight: 600}}> ({playerData?.age})</span>
                    </p>
                    <p>Position: {playerData?.sub_position}</p>
                    <p>Height: {playerData?.height_in_cm}cm</p>
                </div>
            </div>
            <div className="graph">
                <AppearancesChart data={playerGameData} onZoomChange={setZoomedData} />
            </div>
        </div>
    )
};

export default Player;