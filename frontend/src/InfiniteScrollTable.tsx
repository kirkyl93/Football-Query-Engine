import React, { useEffect, useState, useRef, useCallback } from 'react';
import { PlayerSearchResult } from './types'; // Import the Player type
import { Link, useLocation, useNavigate } from "react-router-dom";
import './InfiniteScrollTable.css';
import { isReadable } from 'stream';


interface InfiniteScrollTableProps {
  selectedSeasons: number[];
  selectedCompetitions: string[];
  subsOnly: boolean;
}

const InfiniteScrollTable: React.FC<InfiniteScrollTableProps> = ({
  selectedSeasons,
  selectedCompetitions,
  subsOnly
}) => {
  const [data, setData] = useState<PlayerSearchResult[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersKey, setFiltersKey] = useState(0);

  const observer = useRef<IntersectionObserver | null>(null);
  const location = useLocation();

  useEffect(() => {
    setCurrentPage(0);
    setData([]);
    setHasMore(true);
    setFiltersKey((prevKey) => prevKey + 1);
  }, [selectedSeasons, selectedCompetitions])
  
  useEffect(() => {
    const loadPlayers = async () => {
      if (loading) {
        return;
      }
      setLoading(true);
      await fetchMoreData();
    };

    loadPlayers();
  }, [filtersKey]);

  useEffect(() => {
    const loadMorePlayers = async () => {
      if (loading || currentPage === 0) {
        return;
      }
      setLoading(true);
      fetchMoreData();
    }
    
    loadMorePlayers();
  }, [currentPage])


  const constructSearchUrl = (): string => {
    let url = `http://localhost:8080/search?page=${currentPage}&limit=50`;

    const params = new URLSearchParams(location.search);
    const seasonsParam = params.get('seasons');
    const competitionsParam = params.get('comps');
    const positionsParam = params.get('positions');
    const minuteFromParam = params.get('minfrom');
    const minuteToParam = params.get('minto');
    const minAgeParam = params.get('minage');
    const maxAgeParam = params.get('maxage');
    const playerNameParam = params.get('name');
    const subsOnlyParam = params.has('subonly');
    const earliestSubOnTimeParam = params.get('earliestsub');
    const latestSubOnTimeParam = params.get('latestsub');
    const penalties = params.get('penalty');
    const sortByParam = params.get('sort');

    if (seasonsParam) {
      url += `&seasons=${seasonsParam}`;
    }

    if (competitionsParam) {
      url += `&comps=${competitionsParam}`;
    }

    if (positionsParam) {
      url += `&positions=${positionsParam}`;
    }

    if (minuteFromParam) {
      url += `&minfrom=${minuteFromParam}`;
    }

    if (minuteToParam) {
      url += `&minto=${minuteToParam}`;
    }

    if (minAgeParam) {
      url += `&minage=${minAgeParam}`;
    }

    if (maxAgeParam) {
      url += `&maxage=${maxAgeParam}`;
    }

    if (playerNameParam) {
      url += `&name=${playerNameParam}`;
    }

    if (subsOnlyParam) {
      url += "&subonly=1";
    }

    if (subsOnlyParam && earliestSubOnTimeParam) {
      url += `&earliestsub=${earliestSubOnTimeParam}`;
    }

    if (subsOnlyParam && latestSubOnTimeParam) {
      url += `&latestsub=${latestSubOnTimeParam}`;
    }

    if (penalties) {
      url += `&penalty=${penalties}`;
    }

    if (sortByParam) {
      url += `&sort=${sortByParam}`;
    }
    
    return url;
  }

  const fetchMoreData = async () => {
    try {
      const url = constructSearchUrl();
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const data: PlayerSearchResult[] = await response.json();

      if (currentPage === 0) {
        setData(data);
      } else {
        if (data.length === 0) {
          setHasMore(false);
        } else {
          setData(prevPlayers => [...prevPlayers, ...data]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch players');
    } finally {
      setLoading(false);
    }
  };

  const lastPlayerElementRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setCurrentPage(prevPage => prevPage + 1);
        }
      });

      if (node) {
        observer.current.observe(node);
      }
    },
    [hasMore, loading]
  );

  return (
    <div className="table-container">
      <table className="generic-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Clubs</th>
            <th>Position</th>
            <th>Appearances</th>
            <th>Minutes Played</th>
            <th>Goals</th>
            <th>Assists</th>
            <th>Yellow Cards</th>
            <th>Red Cards</th>
          </tr>
        </thead>
        <tbody>
          {data.map((player, index) => (
            <tr key={player.player_id}
                ref={data.length === index + 1 ? lastPlayerElementRef : null}
            >
            <td>{index + 1}</td>
            <td style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src={`https://flagicons.lipis.dev/flags/4x3/${player.country_code}.svg`}
              alt={`${player.country_code}`}
              style={{ width: '20px', height: '14px', marginRight: '10px' }}
          />
              <img
                src={player.image_url}
                alt={player.player_name}
                width="50"
                style={{ marginRight: '10px', borderRadius: '50%' }} // Circular image
              />
              <Link
                to={`/player/${player.player_id}`} // Use your route pattern
                style={{ textDecoration: 'none', color: 'inherit' }} // Optional styling
              >
                {player.player_name}
              </Link>
            </td>
              <td>
                {player.clubs_played_for.split(',').map(clubId => {
                  const trimmedClubId = clubId.trim();
                  return (
                    <img
                    key={trimmedClubId}
                    src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(trimmedClubId)}.png`}
                    alt={`Club ${trimmedClubId}`}
                    width="30"
                    style={{ marginRight: '5px' }}
                    />
                  );
              })}
              </td>
              <td>{player.sub_position}</td>
              <td><strong>{player.total_appearances}</strong> 
              {!subsOnly && (<> ({player.substitute_appearances})</>)}</td>
              <td>{player.total_minutes_played}</td>
              <td>{player.total_goals}</td>
              <td>{player.total_assists}</td>
              <td>{player.total_yellow_cards}</td>
              <td>{player.total_red_cards}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && hasMore && <div className="loading">Loading more players...</div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default InfiniteScrollTable;
