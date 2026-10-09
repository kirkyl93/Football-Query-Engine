import {
    createDefaultPlayerStats,
    PlayerAppearance,
    PlayerStats,
} from "../../../types/Player";

const processMinute = (minute: number, minuteArray: number[]) => {
    if (minute < 1) {
        return;
    }

    let index = Math.floor((minute - 1) / 15);

    if (index > minuteArray.length - 1) {
        index = minuteArray.length - 1;
    }

    minuteArray[index]++;
};

const incrementBucket = (value: number, buckets: number[]) => {
    let index = value >= buckets.length - 1 ? buckets.length - 1 : value;
    buckets[index]++;
};

const processMinutesPlayedBucket = (start: number, end: number, minutesPlayed: number[]) => {
    const intervals = [15, 30, 45, 60, 75, 90, 120];

    for (let i = 0; i < intervals.length; i++) {
        if (start < intervals[i]) {
            minutesPlayed[i] += Math.min(intervals[i], end) - Math.max(start, i === 0 ? 0 : intervals[i - 1]);
        }

        if (end <= intervals[i]) {
            return;
        }
    }
};

/**
 * Aggregates per-appearance data into player + team totals, buckets and
 * distributions.
 */
export const calculatePlayerAndTeamStats = (appearances: PlayerAppearance[]): PlayerStats => {
    if (!appearances) {
        return createDefaultPlayerStats();
    }

    let playerStats = createDefaultPlayerStats();
    playerStats.totalGames = appearances.length;

    appearances.forEach((appearance) => {
        let startedGame = appearance.minutes_played[0] === 0;
        let finishedGame = appearance.subbed_off_minute === 0;

        if (startedGame && finishedGame) {
            playerStats.gamesStartedAndFinished++;
        } else if (startedGame) {
            playerStats.gamesStartedAndSubbedOff++;
        } else if (finishedGame) {
            playerStats.gamesSubbedOnAndFinished++;
        } else {
            playerStats.gamesSubbedOnAndSubbedOff++;
        }

        playerStats.totalMinutes += appearance.minutes_played[1] - appearance.minutes_played[0];
        processMinutesPlayedBucket(appearance.minutes_played[0], appearance.minutes_played[1], playerStats.playerAppearancesByMinute);
        let teamGoals = appearance.club_id === appearance.home_club_id ? appearance.home_club_goals : appearance.away_club_goals;
        let teamGoalsConceded = appearance.club_id === appearance.home_club_id ? appearance.away_club_goals : appearance.home_club_goals;
        if (teamGoals > teamGoalsConceded) {
            playerStats.totalWins++;
        } else if (teamGoals === teamGoalsConceded) {
            playerStats.totalDraws++;
        } else {
            playerStats.totalLosses++;
        }
        playerStats.totalTeamGoals += teamGoals;
        playerStats.totalTeamGoalsConceded += teamGoalsConceded;
        playerStats.totalPlayerGoalsExcludingPenalties += appearance.goals - appearance.penalty_goals;
        playerStats.totalPenalties += appearance.penalty_goals;
        playerStats.totalPlayerAssists += appearance.assist_minutes.length;
        playerStats.totalYellows += appearance.yellow_minutes.length;
        playerStats.totalReds += appearance.red_minutes.length;
        if (appearance.yellow_minutes.length == 2) {
            playerStats.totalReds++;
        }

        incrementBucket(appearance.goals, playerStats.playerGoalsByGame);

        appearance.goal_minutes.forEach(goalMinute => {
            processMinute(goalMinute, playerStats.playerGoalsByMinute);
        })

        appearance.penalty_goal_minutes.forEach(penaltyMinute => {
            processMinute(penaltyMinute, playerStats.playerGoalsByMinute);
        })

        incrementBucket(appearance.assists, playerStats.playerAssistsByGame);

        appearance.assist_minutes.forEach(assistMinute => {
            processMinute(assistMinute, playerStats.playerAssistsByMinute);
        })

        incrementBucket(teamGoals, playerStats.teamGoalsByGame);

        incrementBucket(teamGoalsConceded, playerStats.teamGoalsConcededByGame);

    });

    return playerStats;
};
