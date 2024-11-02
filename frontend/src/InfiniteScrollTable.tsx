import React, {useEffect, useState, useRef, useCallback, useMemo} from 'react';
import { PlayerSearchResult } from './types'; // Import the Player type
import { Link, useLocation } from "react-router-dom";
import './InfiniteScrollTable.css';
import {competitions} from "./competitions";
import {formatSeason} from "./utils";

interface InfiniteScrollTableProps {
  selectedSeasons: number[];
  selectedCompetitions: string[];
  selectedPositions: string[];
  minuteFrom: number | undefined;
  minuteTo: number | undefined;
  minAge: number | undefined;
  maxAge: number | undefined;
  playerName: string | undefined;
  subsOnly: boolean;
  earliestSubOnTime: number | undefined;
  latestSubOnTime: number | undefined;
  penalties: string;
  sortBy: string;

}

const InfiniteScrollTable: React.FC<InfiniteScrollTableProps> = ({
  selectedSeasons,
  selectedCompetitions, selectedPositions,
    minuteFrom, minuteTo, minAge, maxAge,
    playerName, subsOnly, earliestSubOnTime, latestSubOnTime,
    penalties, sortBy
}) => {
  const [data, setData] = useState<PlayerSearchResult[]>([]);
  const [hasData, setHasData] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentRequestController = useRef<AbortController | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const currentRankRef = useRef(1);
  const location = useLocation();

  const searchParamsRef = useRef<string>("-1");

  const currentSearchParams = useMemo(() => {
    return new URLSearchParams(location.search).toString();
  }, [location.search]);

  const abortCurrentRequest = () => {
    if (currentRequestController.current) {
      currentRequestController.current.abort();
      currentRequestController.current = null;
    }
  };

  useEffect(() => {
    abortCurrentRequest();
    setCurrentPage(0);
    setData([]);
    setHasData(false);
    setLoading(true);
    setHasMore(true);
  }, [location.search, selectedSeasons, selectedCompetitions, selectedPositions, minuteFrom, minuteTo, minAge, maxAge, playerName, subsOnly]);

  useEffect(() => {
    fetchData();
  }, [currentSearchParams]);

  useEffect(() => {
    if (currentPage > 0) {
      fetchData();
    }

    return () => {
      if (currentRequestController.current) {
        currentRequestController.current.abort();
        currentRequestController.current = null;
      }
    };
  }, [currentPage, selectedSeasons, selectedCompetitions]);

  const fetchData = async (): Promise<void> => {
    if (searchParamsRef.current === currentSearchParams) {
      return;
    }

    if (currentPage >= 5) {
      setHasMore(false);
      return;
    }

    abortCurrentRequest();
    currentRequestController.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const url = constructSearchUrl();
      const response = await fetch(url, {
        signal: currentRequestController.current.signal
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const newData: PlayerSearchResult[] = await response.json();

      if (currentRequestController.current && !currentRequestController.current.signal.aborted) {
        if (newData.length < 50) {
          setHasMore(false);
        }

        if (currentPage === 0) {
          setData(newData);
          setHasData(true);
        } else {
          setData(prevData => [...prevData, ...newData]);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setError('Failed to fetch players');
      }
    }
  };

  const calculateRank = (index: number, player: PlayerSearchResult): number => {
    if (index === 0) {
      currentRankRef.current = 1;
      return currentRankRef.current;
    }

      if (getSortValue(player) < getSortValue(data[index - 1])) {
        currentRankRef.current = index + 1;
      }

      return currentRankRef.current;
  }

  const sortByTitle = (): string => {
    switch (sortBy) {
      case 'g':
        return "TOP SCORERS ";
      case 'a':
        return "MOST ASSISTS ";
      case 'ga':
        return "MOST ASSISTS + GOALS ";
        case 'ap':
        return "MOST APPS ";
      case 'm':
        return "MOST MINS ";
      case 'y':
        return "MOST YELLOWS ";
      case 'r':
        return "MOST REDS ";
      default:
        return "TOP SCORERS ";
    }
  }

  const competitionsTitle = (): string => {
    if (selectedCompetitions.length === 0) {
      return "ALL COMPS";
    }

    if (selectedCompetitions.length >= 10) {
      return selectedCompetitions.length + " COMPS";
    }

    const competitionNames = selectedCompetitions.map(compId => {
      const leagueComp = competitions.leagues.find(comp => comp.competitionId === compId);
        if (leagueComp) {
          return leagueComp.name.toUpperCase();
        }
        const euroComp = competitions.europeanCompetitions.find(comp => comp.competitionId === compId);
        return euroComp ? euroComp.name.toUpperCase() : compId;
      });
      return competitionNames.join(" · ");
  }

  const seasonsTitle = (): string => {
    if (selectedSeasons.length === 0) {
      return "ALL SEASONS";
    }

    if (selectedSeasons.length === 1) {
      return formatSeason(selectedSeasons[0]);
    }

    const seasons = selectedSeasons.sort((a, b) => a - b);
    const isConsecutive = seasons.every((season, index, arr) => index === 0 || season - arr[index - 1] === 1);

    if (isConsecutive) {
      return formatSeason(selectedSeasons[0]) + "-" + formatSeason(selectedSeasons[selectedSeasons.length - 1]);
    }

    if (seasons.length >= 10) {
      return selectedSeasons.length + " SEASONS";
    }

    const formattedSeasons = selectedSeasons.sort((a, b) => a - b).map(season => formatSeason(season));
    return formattedSeasons.join(" · ");
  }

  const positionTitle = (): string => {
    if (selectedPositions.length === 0) {
      return "";
    }

    return " · " + selectedPositions.join(" · ");
  }

  const minsTitle = (): string => {
    let minuteString = "";
    if (minuteFrom !== undefined && minuteFrom > 0) {
      minuteString += " · FROM MINUTE " + minuteFrom;
    }

    if (minuteTo !== undefined && minuteTo > 0) {
      minuteString += " · UP UNTIL MINUTE " + minuteTo;
    }
    return minuteString;
  }

  const ageTitle = (): string => {
    let ageString = "";
    if (minAge !== undefined && minAge > 0) {
      ageString += " · MIN AGE: " + minAge;
    }

    if (maxAge !== undefined && maxAge > 0) {
      ageString += " · MAX AGE: " + maxAge;
    }
    return ageString;
  }

  const nameTitle = (): string => {
    if (playerName !== undefined && playerName.trim().length > 0) {
      return " · PLAYER NAME: " + playerName.trim().toUpperCase();
    }
    return "";
  }

  const subsTitle = (): string => {
    let subString = "";
    if (!subsOnly) {
      return subString;
    }

    subString += " · SUBS ONLY";

    if (earliestSubOnTime !== undefined && earliestSubOnTime > 0) {
      subString += " · EARLIEST SUB ON TIME: " + earliestSubOnTime;
    }

    if (latestSubOnTime !== undefined && latestSubOnTime > 0) {
      subString += " · LATEST SUB ON TIME: " + latestSubOnTime;
    }
    return subString;
  }

  const pensTitle = (): string => {
    if (penalties === "ep") {
      return " · EXCLUDE PENALTIES";
    }

    if (penalties === "op") {
      return " · ONLY PENALTIES";
    }

    return "";
  }

  const constructTitle = useMemo((): string => {
      let title = sortByTitle();
      title += "· " + competitionsTitle();
      title += " · " + seasonsTitle();
      title += positionTitle();
      title += minsTitle();
      title += ageTitle();
      title += nameTitle();
      title += subsTitle();
      title += pensTitle();

      return title;
  }, [selectedSeasons, selectedCompetitions, selectedCompetitions, selectedPositions, minuteFrom,
    minuteTo, minAge, maxAge, playerName, subsOnly, earliestSubOnTime, latestSubOnTime, penalties,
    sortBy]);

  const getSortValue = (player: PlayerSearchResult): number => {
    switch (sortBy) {
      case 'g':
        return player.total_goals;
      case 'a':
        return player.total_assists;
      case 'ga':
        return player.total_goals + player.total_assists;
      case 'ap':
        return player.total_appearances;
      case 'm':
        return player.total_minutes_played;
      case 'y':
        return player.total_yellow_cards
      case 'r':
        return player.total_red_cards
      default:
        return player.total_goals
    }
  }

  const constructSearchUrl = (): string => {
    let url = `http://localhost:8080/search?page=${currentPage}&limit=50`;
    const params = new URLSearchParams(location.search);

    const paramMapping: Record<string, string> = {
      seasons: 'seasons',
      comps: 'comps',
      positions: 'positions',
      minfrom: 'minfrom',
      minto: 'minto',
      minage: 'minage',
      maxage: 'maxage',
      name: 'name',
      penalty: 'penalty',
      sort: 'sort'
    };

    Object.entries(paramMapping).forEach(([key, paramKey]) => {
      const value = params.get(paramKey);
      if (value) {
        url += `&${key}=${value}`;
      }
    });

    if (params.has('subonly')) {
      url += "&subonly=1";

      const earliestSub = params.get('earliestsub');
      const latestSub = params.get('latestsub');

      if (earliestSub) {
        url += `&earliestsub=${earliestSub}`;
      }

      if (latestSub) {
        url += `&latestsub=${latestSub}`;
      }
    }
    return url;
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

  useEffect(() => {
    return () => {
      abortCurrentRequest();
        observer.current?.disconnect();
    };
  }, []);

  return (
    <div className="table-container">
      {hasData && (
          <>
        <h4 className="title">
          {constructTitle}
        </h4>
      <table className="generic-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th className="player-name">Player</th>
            <th className="column-to-hide">Clubs</th>
            <th className="column-to-hide">Position</th>
            <th className="table-header">Apps</th>
            <th className="table-header">Mins</th>
            <th>Goals</th>
            <th>Assists</th>
            <th>Yellows</th>
            <th>Reds</th>
          </tr>
        </thead>
        <tbody>
          {data.map((player, index) => (
            <tr key={player.player_id}
                ref={data.length === index + 1 ? lastPlayerElementRef : null}
            >
            <td>
              {calculateRank(index, player)}.</td>
            <td>
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
              <td className="column-to-hide">
                {player.clubs_played_for.split(',').map(clubId => {
                  const trimmedClubId = clubId.trim();
                  return (
                      <img
                          key={trimmedClubId}
                          src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(trimmedClubId)}.png`}
                          alt={`Club ${trimmedClubId}`}
                          width="30"
                          style={{marginRight: '5px'}}
                      />
                  );
                })}
              </td>
              <td className="column-to-hide">{player.sub_position}</td>
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
        </>
      )}

      {loading && !hasData && <div className="loader-container">
        <div className="bouncing-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </div>}
      {loading && hasData && hasMore && <div className="loading">Loading more players...</div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default InfiniteScrollTable;
