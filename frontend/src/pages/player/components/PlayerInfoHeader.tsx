import React from "react";
import {convertDateStringToDate, dateFormatter} from "../../../lib/DateUtils";
import {Player} from "../../../types/Player";
import tableStyles from '../../search/components/SearchByCountTable.module.css';
import styles from '../Player.module.css';

interface PlayerInfoHeaderProps {
    playerData: Player;
    /**
     * Mirror layout for the comparison player: details first, then picture
     * — a symmetrical reflection of the main player's photo-first header.
     */
    mirror?: boolean;
}

const PlayerInfoHeader: React.FC<PlayerInfoHeaderProps> = ({playerData, mirror = false}) => {
    const photo = (
        <div style={{fontWeight: "800", fontSize: "14px"}}>
            {/*<img*/}
            {/*    src={playerData?.image_url}*/}
            {/*    alt={playerData?.first_name + " " + playerData?.last_name}*/}
            {/*    width="95"*/}
            {/*    style={{borderRadius: '25%', marginRight: mirror ? "0" : "10px", marginLeft: mirror ? "10px" : "0"}}*/}
            {/*/>*/}
        </div>
    );
    const details = (
        <div style={{marginRight: mirror ? "0" : "100px"}}>
            <h3>{playerData?.first_name + " " + playerData?.last_name}</h3>
            <p>
                Nation:
                    <img
                        className={tableStyles['second-gs-columns-to-hide']}
                    src={`https://flagicons.lipis.dev/flags/4x3/${playerData?.country_code}.svg`}
                    alt={`${playerData?.country_code}`}
                    style={{width: '17px', height: '13px', marginRight: '5px', marginLeft: '5px'}}
                />
                {playerData?.country_of_citizenship}
            </p>
            <p>
                Date of birth: {dateFormatter.format(convertDateStringToDate(playerData?.date_of_birth || ""))}<span
                style={{fontWeight: 600}}> ({playerData?.age})</span>
            </p>
            <p>Position: {playerData?.sub_position}</p>
            <p>Height: {playerData?.height_in_cm}cm</p>
        </div>
    );
    return (
        <div className={`${styles['player-header']} ${mirror ? styles['player-header-mirror'] : ''}`}>
            {mirror ? <>{details}{photo}</> : <>{photo}{details}</>}
        </div>
    );
};

export default PlayerInfoHeader;
