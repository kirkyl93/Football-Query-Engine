import React from "react";
import {convertDateStringToDate, dateFormatter} from "../../../lib/DateUtils";
import {Player} from "../../../types/Player";

interface PlayerInfoHeaderProps {
    playerData: Player;
}

const PlayerInfoHeader: React.FC<PlayerInfoHeaderProps> = ({playerData}) => {
    return (
        <>
            <div style={{fontWeight: "800", fontSize: "14"}}>
                <img
                    src={playerData?.image_url}
                    alt={playerData?.first_name + " " + playerData?.last_name}
                    width="95"
                    style={{borderRadius: '25%', marginRight: "10px"}}
                />
            </div>
            <div style={{marginRight: "100px"}}>
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
                    Date of birth: {dateFormatter.format(convertDateStringToDate(playerData?.date_of_birth || ""))}<span
                    style={{fontWeight: 600}}> ({playerData?.age})</span>
                </p>
                <p>Position: {playerData?.sub_position}</p>
                <p>Height: {playerData?.height_in_cm}cm</p>
            </div>
        </>
    );
};

export default PlayerInfoHeader;
