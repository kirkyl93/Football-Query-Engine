import { Link } from "react-router-dom";
import InfiniteScrollTable from "./InfiniteScrollTable";
import { PlayerWithSeasonStats, Competition } from "./types";
import React from "react";
import './HomePage.css';


const goalsColumns = [
    {
        header: 'Player',
        accessor: (playerWithStats: PlayerWithSeasonStats) => (
            <Link className="player" to={`/player/${playerWithStats.player_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <img
            src={`https://tmssl.akamaized.net//images/wappen/head/${playerWithStats.club_id}.png`}
            alt={`${playerWithStats.club_name}`}
            title={`${playerWithStats.club_name}`}
            style={{ width: '27px', height: '37px', marginRight: '10px', borderRadius: '50%' }}
            />
        {/* <img
          src={`https://flagicons.lipis.dev/flags/4x3/${playerWithStats.country_code}.svg`}
          alt={`${playerWithStats.country_of_citizenship}`}
          style={{ width: '30px', height: '20px', marginRight: '10px' }}
        /> */}
        <img 
            src={playerWithStats.image_url || 'fake_image.jpg'} 
                alt={`${playerWithStats.first_name} ${playerWithStats.last_name}`} 
                style={{ width: '40px', height: '50px', marginRight: '10px', borderRadius: '50%' }}
                    />
        <span>{`${playerWithStats.first_name} ${playerWithStats.last_name}`}</span>
      </Link>
        ),
    },
    {
        header: 'Goals',
        accessor: (playerWithStats: PlayerWithSeasonStats) => playerWithStats.total_goals || 0,
    }
]

const assistsColumns = [
    {
        header: 'Player',
        accessor: (playerWithStats: PlayerWithSeasonStats) => (
            <Link className="player" to={`/player/${playerWithStats.player_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        {/* <img
          src={`https://flagicons.lipis.dev/flags/4x3/${playerWithStats.country_code}.svg`}
          alt={`${playerWithStats.country_of_citizenship}`}
          style={{ width: '30px', height: '20px', marginRight: '10px' }}
        /> */
        <img
            src={`https://tmssl.akamaized.net//images/wappen/head/${playerWithStats.club_id}.png`}
            alt={`${playerWithStats.club_name}`}
            title={`${playerWithStats.club_name}`}
            style={{ width: '27px', height: '37px', marginRight: '10px', borderRadius: '50%' }}
            />}
        <img 
            src={playerWithStats.image_url || 'fake_image.jpg'} 
                alt={`${playerWithStats.first_name} ${playerWithStats.last_name}`} 
                style={{ width: '40px', height: '50px', marginRight: '10px', borderRadius: '50%' }}
                    />
        <span>{`${playerWithStats.first_name} ${playerWithStats.last_name}`}</span>
      </Link>
        ),
    },
    {
        header: 'Assists',
        accessor: (playerWithStats: PlayerWithSeasonStats) => playerWithStats.total_assists || 0,
    }
]

const goalsFetchUrl = (page: number, seasons: number[], competitions: string[]) => {
    let url = `http://localhost:8080/top-goals?page=${page}&limit=20`;

    if (seasons.length > 0) {
        const seasonParams = seasons.map(season => `season[]=${season}`).join('&');
        url += `&${seasonParams}`;
    }

    return url;
    
}

const assistsFetchUrl = (page: number, season: number[], competition: string[]) => {
    let url = `http://localhost:8080/top-assists?page=${page}&limit=20`;
    if (season) url += `&season=${season}`;
    if (competition) url += `&competition=${competition}`;
    return url;
}

const HomePage: React.FC = () => {
    const seasons = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012];
    const competitions: Competition[] = [];
    return (
        <div className="tables-container">
        
            </div>
    
    );
};

export default HomePage