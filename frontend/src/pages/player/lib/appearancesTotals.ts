import {PlayerAppearance, PlayerTotals} from "../../../types/Player";

/**
 * Totals over the zoomed range for the summary header.
 */
export const calculateAppearancesTotals = (zoomedData: PlayerAppearance[]): PlayerTotals => {
    let playerTotals: PlayerTotals = {
        goals: 0,
        penalties: 0,
        ownGoals: 0,
        assists: 0,
        cleanSheets: 0,
        yellows: 0,
        reds: 0
    };


    zoomedData.map(app => {
        playerTotals.goals += app.goals - app.penalty_goals;
        playerTotals.penalties += app.penalty_goals;
        playerTotals.ownGoals += app.own_goal_minutes.length;
        playerTotals.assists += app.assist_minutes.length;
        const cleanSheet = app.club_id === app.home_club_id ? app.away_club_goals === 0 : app.home_club_goals === 0;
        if (cleanSheet) {
            playerTotals.cleanSheets++;
        }
        if (app.yellow_cards < 2) {
            playerTotals.yellows += app.yellow_cards;
        }
        playerTotals.reds += app.red_cards;
        if (app.yellow_cards > 1) {
            playerTotals.reds++;
        }
    })

    return playerTotals;
};
