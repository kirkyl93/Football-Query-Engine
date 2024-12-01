use sqlx::{Postgres, QueryBuilder};
use crate::player::search_models::{HomeAwayOption, PenaltyOption, ProcessedSearchParams, StatScope};

pub fn add_seasons_to_query(query: &mut QueryBuilder<Postgres>, seasons: Vec<i32>) {
    if !seasons.is_empty() {
        query.push("
        AND season IN (");

        for (i, season) in seasons.into_iter().enumerate() {
            if i > 0 {
                query.push(", ");
            }
            query.push_bind(season);
        }

        query.push(")");
    };
}

pub fn add_competitions_to_query(query: &mut QueryBuilder<Postgres>, competitions: Vec<String>) {
    if !competitions.is_empty() {
        query.push("
        AND a.competition_id IN (");

        for (i, competition) in competitions.into_iter().enumerate() {
            if i > 0 {
                query.push(", ");
            }
            query.push_bind(competition);
        }
        query.push(")");
    }
}

pub fn add_positions_to_query(query: &mut QueryBuilder<Postgres>, positions: Vec<String>) {
    if !positions.is_empty() {
        query.push("
        AND p.sub_position IN (");

        for (i, position) in positions.into_iter().enumerate() {
            if i > 0 {
                query.push(", ");
            }
            query.push_bind(position);
        }
        query.push(")");
    }
}

pub fn add_home_away_to_query(query: &mut QueryBuilder<Postgres>, home_or_away: &HomeAwayOption) {
    let home_or_away = match home_or_away {
        HomeAwayOption::Home => "
        AND player_club_id = home_club_id",
        HomeAwayOption::Away => "
        AND player_club_id = away_club_id",
        _ => ""
    };

    if !home_or_away.is_empty() {
        query.push(home_or_away);
    }
}

pub fn add_height_to_query(query: &mut QueryBuilder<Postgres>, min_height: i32, max_height: i32) {
    if min_height > 0 {
        query.push("
        AND height_in_cm >= ").push_bind(min_height);
    }

    if max_height > 0 {
        query.push("
        AND height_in_cm <= ").push_bind(max_height);
    }
}

pub fn add_ages_to_query(query: &mut QueryBuilder<Postgres>, min_age: i32, max_age: i32) {
    if min_age > 0 {
        query.push("
        AND EXTRACT (YEAR FROM age(a.date, p.date_of_birth)) >= ").push_bind(min_age);
    }

    if max_age > 0 {
        query.push("
        AND EXTRACT (YEAR FROM age(a.date, p.date_of_birth)) <= ").push_bind(max_age);
    }
}
pub fn add_player_names_to_query(query: &mut QueryBuilder<Postgres>, player_names: &Vec<String>) {
    if !player_names.is_empty() {
        let name_count = player_names.len();
        query.push("
        AND (");
        for (i, name) in player_names.iter().enumerate() {
            let names: Vec<String> = name.split_whitespace().map(String::from).collect();
            let count = names.len();
            for (j, name) in names.iter().enumerate() {
                query.push("player_code iLIKE ");
                let like_pattern = format!("%{}%", name);
                query.push_bind(like_pattern).push(" ");
                if j < count - 1 {
                    query.push("AND ");
                }
            }
            if i < name_count - 1 {
                query.push("OR ");
            }
        }
        query.push(")");
    }
}

pub fn add_clubs_played_for_to_query(query: &mut QueryBuilder<Postgres>, clubs_played_for: Vec<i32>) {
    if !clubs_played_for.is_empty() {
        query.push("
        AND player_club_id IN (");

        for (i, club) in clubs_played_for.into_iter().enumerate() {
            if i > 0 {
                query.push(", ");
            }
            query.push_bind(club);
        }
        query.push(")");
    }
}

pub fn add_clubs_played_against_to_query(query: &mut QueryBuilder<Postgres>, clubs_played_against: Vec<i32>) {
    if !clubs_played_against.is_empty() {
        query.push("
        AND (");

        for (i, club_id) in clubs_played_against.into_iter().enumerate() {
            if i > 0 {
                query.push(" OR ");
            }

            query.push("(")
                .push_bind(club_id)
                .push(" = home_club_id AND player_club_id != ")
                .push_bind(club_id)
                .push(")");

            query.push(" OR (")
                .push_bind(club_id)
                .push(" = away_club_id AND player_club_id != ")
                .push_bind(club_id)
                .push(")");
        }
        query.push(")");
    }
}


pub fn add_sub_info_to_query(query: &mut QueryBuilder<Postgres>, subs_only: i32, earliest_sub_on_time: i32, latest_sub_on_time: i32) {
    if subs_only > 0 {
        query.push("
        AND a.played_from_minute > ").push_bind(if earliest_sub_on_time > 0 { earliest_sub_on_time - 1 } else { 0 });

        if latest_sub_on_time > 0 {
            query.push("
            AND a.played_from_minute <= ").push_bind(latest_sub_on_time);
        }
    }
}

pub fn add_limit_and_offset_to_query(query: &mut QueryBuilder<Postgres>, limit: i32, page: i32) {
    query.push("
    LIMIT ").push_bind(limit);

    query.push("
    OFFSET ").push_bind(page * limit);
}

pub fn goals_query_string(penalties: &PenaltyOption, game_query: bool) -> String {
    if game_query {
        match penalties {
            PenaltyOption::ExcludePenalties => "goals - penalty_goals".into(),
            PenaltyOption::OnlyPenalties => "penalty_goals".into(),
            _ => "goals".into()
        }
    } else {
        match penalties {
            PenaltyOption::ExcludePenalties => "SUM(a.goals) - SUM(a.penalty_goals)".into(),
            PenaltyOption::OnlyPenalties => "SUM(a.penalty_goals)".into(),
            _ => "SUM(a.goals)".into()
        }
    }
}

pub fn construct_appearances_table_from_game_events(query: &mut QueryBuilder<Postgres>, params: &ProcessedSearchParams) {
    query.push("
    WITH games_minute_appearance_filter AS
    (SELECT a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, c.club_id, g.game_id,");

    if *params.scope() == StatScope::Season {
        query.push(" g.season AS season,");
    }

    add_appearances_minute_filter_to_query(query, params.minute_played_from(), params.minute_played_to());

    query.push("
    MIN(CASE WHEN a.played_from_minute > 0 THEN 1 ELSE 0 END) AS substitute_appearances,");

    add_goals_minute_filter_to_query(query, params.minute_played_from(), params.minute_played_to());
    add_penalties_minute_filter_to_query(query, params.minute_played_from(), params.minute_played_to());
    add_assists_minute_filter_to_query(query, params.minute_played_from(), params.minute_played_to());
    add_yellows_minute_filter_to_query(query, params.minute_played_from(), params.minute_played_to());
    add_reds_minute_filter_to_query(query, params.minute_played_from(), params.minute_played_to());
    add_minutes_played_minute_filter_to_query(query, params.minute_played_from(), params.minute_played_to());

    query.push("
    FROM
        appearances_enhanced a
    JOIN
        clubs c ON c.club_id = a.player_club_id
    JOIN
        players p ON p.player_id = a.player_id
    JOIN
        games g ON g.game_id = a.game_id LEFT JOIN game_events e ON e.game_id = a.game_id AND (e.player_id = a.player_id OR e.player_assist_id = a.player_id)
    WHERE 1 = 1");

    add_seasons_to_query(query, params.seasons().clone());
    add_competitions_to_query(query, params.competitions().clone());
    add_positions_to_query(query, params.positions().clone());
    add_ages_to_query(query, params.minimum_age(), params.maximum_age());
    add_height_to_query(query, params.minimum_height(), params.maximum_height());
    add_home_away_to_query(query, params.home_or_away());
    add_player_names_to_query(query, params.names());
    add_clubs_played_for_to_query(query, params.clubs_played_for().clone());
    add_clubs_played_against_to_query(query, params.clubs_played_against().clone());
    add_sub_info_to_query(query, params.subs_only(), params.earliest_sub_on_time(), params.latest_sub_on_time());

    query.push("
    GROUP BY a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, c.club_id, g.game_id)

    ");
}

fn add_appearances_minute_filter_to_query(query: &mut QueryBuilder<Postgres>, minute_from: i32, minute_to: i32) {
    query.push("
    MIN(CASE WHEN a.played_from_minute <= ").push_bind(minute_to)
        .push(" AND (subbed_off_minute IS NULL OR subbed_off_minute > ").push_bind(minute_from).push(")
         AND played_from_minute + minutes_played >= ").push_bind(minute_from)
        .push(" THEN 1 ELSE 0 END) AS appearances,");
}

fn add_goals_minute_filter_to_query(query: &mut QueryBuilder<Postgres>, minute_from: i32, minute_to: i32) {
    query.push("
    CAST(SUM(CASE WHEN e.type = 'Goals' AND e.player_id = a.player_id AND e.minute BETWEEN ").push_bind(minute_from)
        .push(" AND ").push_bind(minute_to).push(" THEN 1 ELSE 0 END) AS integer) AS goals,");
}

fn add_penalties_minute_filter_to_query(query: &mut QueryBuilder<Postgres>, minute_from: i32, minute_to: i32) {
    query.push("
    CAST(SUM(CASE WHEN e.type = 'Goals' AND e.player_id = a.player_id AND e.minute BETWEEN ").push_bind(minute_from)
        .push(" AND ").push_bind(minute_to).push(" AND e.description ILIKE '%penalty%' THEN 1 ELSE 0 END) AS integer) AS penalty_goals,");
}

fn add_assists_minute_filter_to_query(query: &mut QueryBuilder<Postgres>, minute_from: i32, minute_to: i32) {
    query.push("
    CAST(SUM(CASE WHEN e.type = 'Goals' AND e.player_assist_id = a.player_id AND e.minute BETWEEN ").push_bind(minute_from)
        .push(" AND ").push_bind(minute_to).push(" AND e.player_id != e.player_assist_id THEN 1 ELSE 0 END) AS integer) AS assists,");
}

fn add_yellows_minute_filter_to_query(query: &mut QueryBuilder<Postgres>, minute_from: i32, minute_to: i32) {
    query.push("
    CAST(SUM(CASE WHEN e.type = 'Cards' AND e.player_id = a.player_id AND e.minute BETWEEN ").push_bind(minute_from)
        .push(" AND ").push_bind(minute_to).push(" AND e.description ILIKE '%yellow%' THEN 1 ELSE 0 END) AS integer) AS yellow_cards,");
}

fn add_reds_minute_filter_to_query(query: &mut QueryBuilder<Postgres>, minute_from: i32, minute_to: i32) {
    query.push("
    CAST(SUM(CASE WHEN e.type = 'Cards' AND e.player_id = a.player_id AND e.minute BETWEEN ").push_bind(minute_from)
        .push(" AND ").push_bind(minute_to)
        .push(" AND e.description ILIKE '%red%' THEN 1 ELSE 0 END)
        + CASE WHEN SUM(CASE WHEN e.type = 'Cards' AND e.player_id = a.player_id AND e.minute BETWEEN 0 AND ").push_bind(minute_to)
        .push(" AND e.description ILIKE '%yellow%' THEN 1 ELSE 0 END) >= 2
        AND SUM(CASE WHEN e.type = 'Cards' AND e.player_id = a.player_id AND e.minute BETWEEN ").push_bind(minute_from).push(" AND ").push_bind(minute_to)
        .push(" AND e.description ILIKE '%yellow%' THEN 1 ELSE 0 END) >= 1 THEN 1 ELSE 0 END AS integer) AS red_cards,");
}

fn add_minutes_played_minute_filter_to_query(query: &mut QueryBuilder<Postgres>, minute_from: i32, minute_to: i32) {
    query.push("
    MIN(LEAST(").push_bind(minute_to).push(", subbed_off_minute, played_from_minute + minutes_played) - GREATEST(").push_bind(minute_from).push(", played_from_minute)) + 1 AS minutes_played");
}
