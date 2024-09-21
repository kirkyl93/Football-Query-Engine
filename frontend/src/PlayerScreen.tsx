import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Player, SeasonStats } from "./types";
import './playerScreen.css';

const PlayerScreen: React.FC = () => {
    const { playerId } = useParams<{ playerId: string }>();
    const [player, setPlayer] = useState<Player | null>(null);
    const [seasonStats, setSeasonStats] = useState<SeasonStats[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true); // Add loading state
    const [filters, setFilters] = useState<string[]>(['all']);

    const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setFilters(prev => {
            if (value === 'all') {
                return ['all'];
            }
            const newFilters = prev.filter(f => f !== 'all');
            if (newFilters.includes(value)) {
                return newFilters.filter(f => f !== value);
            } else {
                if (filters.length === 3) {
                    return ['all'];
                } else {
                    return [...newFilters, value];
                }
            }
        });
    };

    useEffect(() => {
        const fetchPlayerData = async () => {
            setLoading(true); // Set loading to true when starting fetch
            try {
                const [playerResponse, statsResponse] = await Promise.all([
                    fetch(`http://localhost:8080/players/${playerId}`),
                    fetch(`http://localhost:8080/players/${playerId}/season-stats`)
                ]);

                // Fix error check condition
                if (!playerResponse.ok || !statsResponse.ok) {
                    throw new Error('Network response was not ok');
                }

                const playerData: Player[] = await playerResponse.json();
                const statsData: SeasonStats[] = await statsResponse.json();

                setPlayer(playerData[0]);
                setSeasonStats(statsData);
            } catch (error) {
                setError('Failed to fetch player data');
            } finally {
                setLoading(false); // Set loading to false after fetching
            }
        };

        fetchPlayerData();
    }, [playerId]);

    if (loading) return <div>Loading...</div>; // Show loading state
    if (error) return <div>{error}</div>; // Show error message

    return (
        <div className="player-screen">
            {player ? (
                <>
                    <h1>{`${player.first_name} ${player.last_name}`}</h1>
                    <img 
                        src={player.image_url || 'fake_image.jpg'} 
                        alt={`${player.first_name} ${player.last_name}`} 
                        style={{ width: '150px', height: '150px', borderRadius: '50%' }} // Adjust image styling
                    />
                    <p><strong>Country:</strong> {player.country_of_citizenship}</p>
                    <p><strong>Age:</strong> {player.age}</p>
                    <p><strong>Position:</strong> {player.position}</p>
                    <p><strong>Date of Birth:</strong> {player.date_of_birth}</p>

                    {/* Render additional data */}
                    {seasonStats.length > 0 && (
                        <div className="table-container">
                        <table className="player-stats-table">
                          <thead>
                            <tr>
                              <th>Season</th>
                              <th>Club Name</th>
                              <th>Competition</th>
                              <th>Appearances</th>
                              <th>Goals</th>
                              <th>Assists</th>
                              <th>Yellow Cards</th>
                              <th>Red Cards</th>
                              <th>Minutes Played</th>
                              <th>Mins per Goal</th>
                              <th>Mins per Assist</th>
                              <th>Mins per Yellow Card</th>
                              <th>Mins per Red Card</th>
                            </tr>
                          </thead>
                          <div className="filter-container">
    <fieldset>
        <legend>Filter by competition type:</legend>
        <label>
            <input
                type="checkbox"
                value="all"
                checked={filters.includes('all')}
                onChange={handleFilterChange}
            /> All
        </label>
        <label>
            <input
                type="checkbox"
                value="league"
                checked={filters.includes('league')}
                onChange={handleFilterChange}
            /> League
        </label>
        <label>
            <input
                type="checkbox"
                value="europe"
                checked={filters.includes('europe')}
                onChange={handleFilterChange}
            /> Europe
        </label>
        <label>
            <input
                type="checkbox"
                value="domestic cup"
                checked={filters.includes('domestic cup')}
                onChange={handleFilterChange}
            /> Domestic Cup
        </label>
        <label>
            <input
                type="checkbox"
                value="other"
                checked={filters.includes('other')}
                onChange={handleFilterChange}
            /> Other
        </label>
    </fieldset>
</div>

                          <tbody>
                            {seasonStats
                            .filter(stat => 
                                filters.includes('all') || 
                                filters.includes(stat.competition_type.toLowerCase())
                            )
                            .map((stat, index) => (
                              <tr key={index}>
                                <td>{stat.season}/{stat.season-1999}</td>
                                <td>{stat.club_name}</td>
                                <td><span>
                                    <img src={`https://flagicons.lipis.dev/flags/4x3/${stat.competition_country_code}.svg`} 
                                    alt={`${stat.competition_country}`} 
                                    style={{ width: '30px', height: '20px', marginRight: '10px', borderRadius: 1 }}  />
                                    {stat.competition_name}</span></td>
                                <td>{stat.total_appearances}</td>
                                <td>{stat.total_goals}</td>
                                <td>{stat.total_assists}</td>
                                <td>{stat.total_yellow_cards}</td>
                                <td>{stat.total_red_cards}</td>
                                <td>{stat.total_minutes_played}</td>
                                <td>{stat.mins_per_goal ?? '-'}</td>
                                <td>{stat.mins_per_assist ?? '-'}</td>
                                <td>{stat.mins_per_yellow_card ?? '-'}</td>
                                <td>{stat.mins_per_red_card ?? '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                </>
            ) : (
                <div>No player data found</div>
            )}
        </div>
    );
};

export default PlayerScreen;
