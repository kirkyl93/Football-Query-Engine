use actix_web::{
    get, web::{self, Path}, HttpResponse,
};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Postgres, QueryBuilder};

use crate::player::{map_position_code_to_position, Player, PlayerSearchResult, PlayerSeasonByCompAndTeam};

// Penalty Options
pub const INCLUDE_PENALTIES: &str = "ip";
pub const EXCLUDE_PENALTIES: &str = "ep";
pub const ONLY_PENALTIES: &str = "op";

// Sort Options
pub const GOALS: &str = "g";
pub const ASSISTS: &str = "a";
pub const GOALS_AND_ASSISTS: &str = "ga";
pub const APPEARANCES: &str = "ap";
pub const MINUTES_PLAYED: &str = "m";
pub const YELLOW_CARDS: &str = "y";
pub const RED_CARDS: &str = "r";
pub const MINUTES_PER_GOAL: &str = "mpg";
pub const MINUTES_PER_ASSIST: &str = "mpa";
pub const MINUTES_PER_GOAL_OR_ASSIST: &str = "mpga";
pub const MINUTES_PER_YELLOW: &str = "mpy";
pub const MINUTES_PER_RED: &str = "mpr";

// Stat Scope
pub const OVERALL: &str = "o";
pub const SEASON: &str = "s";
pub const GAME: &str = "g";

#[derive(Deserialize)]
struct ToolbarSearchParams {
    page: Option<i32>,
    limit: Option<i32>,
    search_name: Option<String>,
}

#[get("/players")]
pub async fn get_players(pool: web::Data<PgPool>, params: web::Query<ToolbarSearchParams>) -> HttpResponse {
    let search_name = params.search_name.as_deref().unwrap_or("");
    let limit = params.limit.unwrap_or(10).min(100);
    let page = params.page.unwrap_or(0).max(0);

    let mut query = QueryBuilder::new("SELECT * FROM players WHERE 1=1 ");

    add_player_name_to_query(&mut query, search_name);

    query.push(" ORDER BY highest_market_value_in_eur DESC NULLS LAST, name");

    add_limit_and_offset_to_query(&mut query, limit, page);

    match query.build_query_as::<Player>()
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(players) => HttpResponse::Ok().json(players),
        Err(err) => {
            println!("{:?}", err.as_database_error());
            HttpResponse::InternalServerError().json(err.to_string())
        }
    }
}

#[get("/players/{id}")]
pub async fn fetch_player(pool: web::Data<PgPool>, path: Path<i32>) -> HttpResponse {
    let id: i32 = path.into_inner();

    match sqlx::query_as::<_, Player>(
        "SELECT * from players WHERE player_id = $1"
    )
        .bind(id)
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(player) => {
            if player.is_empty() {
                HttpResponse::NotFound().json("No player found")
            } else {
                HttpResponse::Ok().json(player)
            }
        }
        Err(_) => HttpResponse::NotFound().json("No player found"),
    }
}

#[get("players/{id}/season-stats")]
pub async fn fetch_player_stats_by_season(pool: web::Data<PgPool>, path: Path<i32>) -> HttpResponse {
    let id: i32 = path.into_inner();

    match sqlx::query_as::<_, PlayerSeasonByCompAndTeam>(
        "SELECT * from player_season_by_comp_view WHERE player_id = $1 ORDER BY season"
    )
        .bind(id)
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(seasons) => {
            if seasons.is_empty() {
                HttpResponse::NotFound().json("Can't find data")
            } else {
                HttpResponse::Ok().json(seasons)
            }
        }
        Err(_) => HttpResponse::NotFound().json("Can't find data"),
    }
}


#[derive(Serialize, Deserialize)]
struct SearchParams {
    page: Option<i32>,
    limit: Option<i32>,
    seasons: Option<String>,
    #[serde(rename = "comps")]
    competitions: Option<String>,
    positions: Option<String>,
    #[serde(rename = "minfrom")]
    minute_played_from: Option<i32>,
    #[serde(rename = "minto")]
    minute_played_to: Option<i32>,
    #[serde(rename = "minage")]
    minimum_age: Option<i32>,
    names: Option<String>,
    #[serde(rename = "clubspf")]
    clubs_played_for: Option<String>,
    #[serde(rename = "clubspa")]
    clubs_played_against: Option<String>,
    #[serde(rename = "maxage")]
    maximum_age: Option<i32>,
    #[serde(rename = "subonly")]
    subs_only: Option<i32>,
    #[serde(rename = "earliestsub")]
    earliest_sub_on_time: Option<i32>,
    #[serde(rename = "latestsub")]
    latest_sub_on_time: Option<i32>,
    penalty: Option<String>,
    scope: Option<String>,
    sort: Option<String>,
    #[serde(rename = "ma")]
    minimum_appearances: Option<i32>,
}

#[get("/search")]
pub async fn search(pool: web::Data<PgPool>, params: web::Query<SearchParams>) -> HttpResponse {
    let mut query = construct_search_query_from_params(&params);

    match query.build_query_as::<PlayerSearchResult>()
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(players) => HttpResponse::Ok().json(players),
        Err(err) => {
            println!("{:?}", err.as_database_error());
            HttpResponse::InternalServerError().json(err.to_string())
        }
    }
}

fn construct_search_query_from_params(params: &web::Query<SearchParams>) -> QueryBuilder<Postgres> {
    let minute_from = params.minute_played_from.unwrap_or(0).min(120);
    let minute_to = params.minute_played_to.unwrap_or(120).max(0);
    let page = params.page.unwrap_or(0).max(0);
    let limit = params.limit.unwrap_or(50).min(100);
    let min_age = params.minimum_age.unwrap_or(0);
    let max_age = params.maximum_age.unwrap_or(0);
    let subs_only: i32 = params.subs_only.unwrap_or(0);
    let earliest_sub_on_time = params.earliest_sub_on_time.unwrap_or(0);
    let latest_sub_on_time = params.latest_sub_on_time.unwrap_or(0);
    let penalties: &str = params.penalty.as_deref().unwrap_or(INCLUDE_PENALTIES);
    let stat_scope: &str = params.scope.as_deref().unwrap_or(OVERALL);
    let sort_by: &str = params.sort.as_deref().unwrap_or(GOALS);
    let minimum_appearances: i32 = params.minimum_appearances.unwrap_or(0);

    let seasons: Vec<i32> = params.seasons
        .as_ref()
        .map(|s| s.split(',').filter_map(|s| s.parse().ok()).collect())
        .unwrap_or_else(Vec::new);

    let competitions: Vec<&str> = params.competitions
        .as_ref()
        .map(|c| c.split(',').collect())
        .unwrap_or_else(Vec::new);

    let positions: Vec<&str> = params.positions
        .as_ref()
        .map(|p| p.split(',').map(|s| map_position_code_to_position(s)).collect())
        .unwrap_or_else(Vec::new);

    let names: Vec<&str> = params.names
        .as_ref()
        .map(|p| p.split(',').collect())
        .unwrap_or_else(Vec::new);

    let clubs_played_for: Vec<i32> = params.clubs_played_for
        .as_ref()
        .map(|s| s.split(',').filter_map(|s| s.parse().ok()).collect())
        .unwrap_or_else(Vec::new);

    let clubs_played_against: Vec<i32> = params.clubs_played_against
        .as_ref()
        .map(|s| s.split(',').filter_map(|s| s.parse().ok()).collect())
        .unwrap_or_else(Vec::new);

    // These are the defaults when no values are passed in the URL. We can
    if minute_from == 0 && minute_to == 120 {
        return build_query_from_appearances(page, limit, minimum_appearances,
                                            min_age, max_age, names,
                                            clubs_played_for, clubs_played_against,
                                            subs_only, earliest_sub_on_time,
                                            latest_sub_on_time, penalties,
                                            stat_scope, sort_by, seasons,
                                            competitions, positions);
    }

    return build_query_from_events(page, limit, minimum_appearances,
                                   min_age, max_age, names,
                                   clubs_played_for, clubs_played_against,
                                   minute_from, minute_to, subs_only, earliest_sub_on_time,
                                   latest_sub_on_time, penalties,
                                   stat_scope, sort_by, seasons,
                                   competitions, positions);
}

fn build_query_from_events<'a>(page: i32, limit: i32, minimum_appearances: i32,
                               min_age: i32, max_age: i32, player_names: Vec<&str>,
                               clubs_played_for: Vec<i32>, clubs_played_against: Vec<i32>,
                               minute_from: i32, minute_to: i32, subs_only: i32, earliest_sub_on_time: i32,
                               latest_sub_on_time: i32, penalties: &'a str,
                               stat_scope: &'a str, sort_by: &'a str, seasons: Vec<i32>,
                               competitions: Vec<&str>, positions: Vec<&str>) -> QueryBuilder<'a, Postgres> {
    let mut query = QueryBuilder::new(
        "
    WITH games_minute_appearance_filter AS
    (SELECT a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, c.club_id,");

    if stat_scope == SEASON {
        query.push(" g.season AS season,");
    }

    add_appearances_minute_filter_to_query(&mut query, minute_from, minute_to);

    query.push("
    MIN(CASE WHEN a.played_from_minute > 0 THEN 1 ELSE 0 END) AS substitute_appearances,");

    add_goals_minute_filter_to_query(&mut query, minute_from, minute_to);
    add_penalties_minute_filter_to_query(&mut query, minute_from, minute_to);
    add_assists_minute_filter_to_query(&mut query, minute_from, minute_to);
    add_yellows_minute_filter_to_query(&mut query, minute_from, minute_to);
    add_reds_minute_filter_to_query(&mut query, minute_from, minute_to);
    add_minutes_played_minute_filter_to_query(&mut query, minute_from, minute_to);

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

    add_seasons_to_query(&mut query, seasons);
    add_competitions_to_query(&mut query, competitions);
    add_positions_to_query(&mut query, positions);
    add_ages_to_query(&mut query, min_age, max_age);
    add_player_names_to_query(&mut query, player_names);
    add_clubs_played_for_to_query(&mut query, clubs_played_for);
    add_clubs_played_against_to_query(&mut query, clubs_played_against);
    add_sub_info_to_query(&mut query, subs_only, earliest_sub_on_time, latest_sub_on_time);

    query.push("
    GROUP BY a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, c.club_id, g.game_id)

    ");

    let goals_calculation = goals_query_string(penalties);

    query.push("
    SELECT ");

    add_rank_to_query(&mut query, sort_by, goals_calculation, true);

    query.push("player_id, player_name, image_url, country_of_citizenship, sub_position,
    COUNT(*) AS total_appearances,
    SUM(substitute_appearances) AS substitute_appearances,
	");

    query.push(goals_calculation).push(" AS total_goals,");

    query.push("
    SUM(assists) AS total_assists,
    SUM(yellow_cards) AS total_yellow_cards,
    SUM(red_cards) AS total_red_cards,
    SUM(minutes_played) AS total_minutes_played,
    STRING_AGG(DISTINCT a.club_id::TEXT, ', ') AS clubs_played_for,");
    if stat_scope == SEASON {
        query.push("
    a.season AS season,");
    }

    add_minutes_per_event_calculations(&mut query, goals_calculation, true);

    query.push("
    FROM
        games_minute_appearance_filter a
        WHERE appearances > 0");

    add_group_by_to_query(&mut query, stat_scope == SEASON);
    add_minimum_appearances_to_query(&mut query, minimum_appearances);
    add_order_by_to_query(&mut query, sort_by, goals_calculation, true);
    add_limit_and_offset_to_query(&mut query, limit, page);

    return query;
}

fn build_query_from_appearances<'a>(page: i32, limit: i32, minimum_appearances: i32,
                                    min_age: i32, max_age: i32, player_names: Vec<&str>,
                                    clubs_played_for: Vec<i32>, clubs_played_against: Vec<i32>,
                                    subs_only: i32, earliest_sub_on_time: i32,
                                    latest_sub_on_time: i32, penalties: &'a str,
                                    stat_scope: &'a str, sort_by: &'a str, seasons: Vec<i32>,
                                    competitions: Vec<&str>, positions: Vec<&str>) -> QueryBuilder<'a, Postgres> {
    let goals_calculation = goals_query_string(penalties);

    let mut query = QueryBuilder::new("SELECT ");

    add_rank_to_query(&mut query, sort_by, goals_calculation, false);

    query.push("
    a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position,
    COUNT(*) AS total_appearances,
    SUM(CASE WHEN a.played_from_minute > 0 THEN 1 ELSE 0 END) AS substitute_appearances,
    ");

    query.push(goals_calculation).push(" AS total_goals,");

    query.push("
    SUM(a.assists) AS total_assists,
    SUM(a.yellow_cards) AS total_yellow_cards,
    SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END) AS total_red_cards,
    SUM(a.minutes_played) AS total_minutes_played,
    STRING_AGG(DISTINCT c.club_id::TEXT, ', ') AS clubs_played_for,");
    if stat_scope == SEASON {
        query.push("
    g.season AS season,");
    }

    add_minutes_per_event_calculations(&mut query, goals_calculation, false);

    query.push("
    FROM
        appearances_enhanced a
    JOIN
        clubs c ON c.club_id = a.player_club_id
    JOIN
        players p ON p.player_id = a.player_id
    JOIN
        games g ON g.game_id = a.game_id
    WHERE 1 = 1");

    add_seasons_to_query(&mut query, seasons);
    add_competitions_to_query(&mut query, competitions);
    add_positions_to_query(&mut query, positions);
    add_ages_to_query(&mut query, min_age, max_age);
    add_player_names_to_query(&mut query, player_names);
    add_clubs_played_for_to_query(&mut query, clubs_played_for);
    add_clubs_played_against_to_query(&mut query, clubs_played_against);
    add_sub_info_to_query(&mut query, subs_only, earliest_sub_on_time, latest_sub_on_time);

    add_group_by_to_query(&mut query, stat_scope == SEASON);
    add_minimum_appearances_to_query(&mut query, minimum_appearances);
    add_order_by_to_query(&mut query, sort_by, goals_calculation, false);
    add_limit_and_offset_to_query(&mut query, limit, page);

    return query;
}


fn goals_query_string(penalties: &str) -> &str {
    match penalties {
        EXCLUDE_PENALTIES => "SUM(a.goals) - SUM(a.penalty_goals)",
        ONLY_PENALTIES => "SUM(a.penalty_goals)",
        _ => "SUM(a.goals)"
    }
}


fn add_minutes_per_event_calculations(query: &mut QueryBuilder<Postgres>, goals_calculation: &str, from_events_table: bool) {
    query.push("
    SUM(a.minutes_played) / NULLIF(").push(goals_calculation).push(", 0) AS mins_per_goal,
    SUM(a.minutes_played) / NULLIF(SUM(a.assists), 0) AS mins_per_assist,
    SUM(a.minutes_played) / NULLIF(").push(goals_calculation).push(" + SUM(a.assists), 0) AS mins_per_goal_or_assist,
    SUM(a.minutes_played) / NULLIF(SUM(a.yellow_cards), 0) AS mins_per_yellow,
    ");

    // We pre-compute red-cards involving two yellow cards when building appearances from the events table.
    // However, if using the appearances table directly, we need to find games where the player was booked twice
    // and add this to the red card count
    if from_events_table {
        query.push("SUM(a.minutes_played) / NULLIF(SUM(a.red_cards), 0) AS mins_per_red");
    } else {
        query.push("SUM(a.minutes_played) / NULLIF(SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END), 0) AS mins_per_red");
    }
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

fn add_rank_to_query(query: &mut QueryBuilder<Postgres>, sort_by: &str, goals_calculation: &str, from_events_table: bool) {
    query.push("RANK() OVER (ORDER BY ");
    let rank_order = match sort_by {
        // Goals
        GOALS => format!("{} DESC", goals_calculation),
        // Assists
        ASSISTS => "SUM(a.assists) DESC".to_string(),
        // Goals and Assists combined
        GOALS_AND_ASSISTS => format!(
            "SUM(a.assists) + {} DESC",
            goals_calculation
        ),
        // Appearances
        APPEARANCES => "COUNT(*) DESC".to_string(),
        // Total minutes played
        MINUTES_PLAYED => "SUM(a.minutes_played) DESC".to_string(),
        // Yellow cards
        YELLOW_CARDS => "SUM(a.yellow_cards) DESC".to_string(),
        // Red cards
        RED_CARDS => if from_events_table {
            "SUM(a.red_cards) DESC".to_string()
        } else {
            "SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END) DESC".to_string()
        },
        MINUTES_PER_GOAL => format!(
            "SUM(a.minutes_played) / NULLIF({}, 0)",
            goals_calculation
        ),
        MINUTES_PER_ASSIST => "SUM(a.minutes_played) / NULLIF(SUM(a.assists), 0)".to_string(),
        MINUTES_PER_GOAL_OR_ASSIST => format!(
            "SUM(a.minutes_played) / NULLIF({} + SUM(a.assists), 0)",
            goals_calculation
        ),
        MINUTES_PER_YELLOW => "SUM(a.minutes_played) / NULLIF(SUM(a.yellow_cards), 0)".to_string(),
        MINUTES_PER_RED => if from_events_table {
            "SUM(a.minutes_played) / NULLIF(SUM(a.red_cards), 0)".to_string()
        } else {
            "SUM(a.minutes_played) / NULLIF((SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END)), 0)".to_string()
        },
        _ => format!("{} DESC", goals_calculation)
    };

    query.push(rank_order).push("),");
}
fn add_seasons_to_query(query: &mut QueryBuilder<Postgres>, seasons: Vec<i32>) {
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

fn add_competitions_to_query(query: &mut QueryBuilder<Postgres>, competitions: Vec<&str>) {
    if !competitions.is_empty() {
        query.push("
        AND a.competition_id IN (");

        for (i, competition) in competitions.into_iter().enumerate() {
            if i > 0 {
                query.push(", ");
            }
            query.push_bind(competition.to_string());
        }
        query.push(")");
    }
}

fn add_positions_to_query(query: &mut QueryBuilder<Postgres>, positions: Vec<&str>) {
    if !positions.is_empty() {
        query.push("
        AND p.sub_position IN (");

        for (i, position) in positions.into_iter().enumerate() {
            if i > 0 {
                query.push(", ");
            }
            query.push_bind(position.to_string());
        }
        query.push(")");
    }
}

fn add_ages_to_query(query: &mut QueryBuilder<Postgres>, min_age: i32, max_age: i32) {
    if min_age > 0 {
        query.push("
        AND EXTRACT (YEAR FROM age(a.date, p.date_of_birth)) >= ").push_bind(min_age);
    }

    if max_age > 0 {
        query.push("
        AND EXTRACT (YEAR FROM age(a.date, p.date_of_birth)) <= ").push_bind(max_age);
    }
}

fn add_player_name_to_query(query: &mut QueryBuilder<Postgres>, player_name: &str) {
    if !player_name.is_empty() {
        let names: Vec<&str> = player_name.split_whitespace().collect();
        let count = names.len();

        query.push("AND ");
        for (i, name) in names.iter().enumerate() {
            query.push("player_code iLIKE ");
            let like_pattern = format!("%{}%", name);
            query.push_bind(like_pattern).push(" ");
            if i < count - 1 {
                query.push("AND ");
            }
        }
    }
}

fn add_player_names_to_query(query: &mut QueryBuilder<Postgres>, player_names: Vec<&str>) {
    if !player_names.is_empty() {
        let name_count = player_names.len();
        query.push("
        AND (");
        for (i, name) in player_names.iter().enumerate() {
            let names: Vec<&str> = name.split_whitespace().collect();
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

fn add_clubs_played_for_to_query(query: &mut QueryBuilder<Postgres>, clubs_played_for: Vec<i32>) {
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

fn add_clubs_played_against_to_query(query: &mut QueryBuilder<Postgres>, clubs_played_against: Vec<i32>) {
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


fn add_sub_info_to_query(query: &mut QueryBuilder<Postgres>, subs_only: i32, earliest_sub_on_time: i32, latest_sub_on_time: i32) {
    if subs_only > 0 {
        query.push("
        AND a.played_from_minute > ").push_bind(if earliest_sub_on_time > 0 { earliest_sub_on_time - 1 } else { 0 });

        if latest_sub_on_time > 0 {
            query.push("
            AND a.played_from_minute <= ").push_bind(latest_sub_on_time);
        }
    }
}

fn add_group_by_to_query(query: &mut QueryBuilder<Postgres>, season_scope: bool) {
    query.push("
    GROUP BY a.player_id, a.player_name, image_url, country_of_citizenship, sub_position");

    if season_scope {
        query.push(", season");
    }
}

fn add_minimum_appearances_to_query(query: &mut QueryBuilder<Postgres>, minimum_appearances: i32) {
    if minimum_appearances > 1 {
        query.push("
    HAVING COUNT(*) >= ").push_bind(minimum_appearances);
    }
}

fn add_order_by_to_query(query: &mut QueryBuilder<Postgres>, sort_by: &str, goals_calculation: &str, from_events_table: bool) {
    query.push("
    ORDER BY ");

    // Sort parameter shortened in URL for efficiency
    let sort_clause = match sort_by {
        // Goals
        GOALS => format!(
            "{} DESC, SUM(a.assists) DESC, SUM(a.minutes_played) ASC, SUM(a.red_cards) ASC, SUM(a.yellow_cards) ASC, a.player_name",
            goals_calculation
        ),
        // Assists
        ASSISTS => format!(
            "SUM(a.assists) DESC, {} DESC, a.player_name",
            goals_calculation
        ),
        // Goals and Assists combined
        GOALS_AND_ASSISTS => format!(
            "SUM(a.assists) + {} DESC, a.player_name",
            goals_calculation
        ),
        // Appearances
        APPEARANCES => "COUNT(*) DESC, SUM(a.minutes_played) DESC, a.player_name".to_string(),
        // Total minutes played
        MINUTES_PLAYED => "SUM(a.minutes_played) DESC, COUNT(*) DESC, a.player_name".to_string(),
        // Yellow cards
        YELLOW_CARDS => "SUM(a.yellow_cards) DESC, SUM(a.red_cards) DESC, a.player_name".to_string(),
        // Red cards
        RED_CARDS => format!(
            "{}, SUM(a.yellow_cards) DESC, a.player_name",
            if from_events_table {
                "SUM(a.red_cards) DESC"
            } else {
                "SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END) DESC"
            }),
        MINUTES_PER_GOAL => format!(
            "SUM(a.minutes_played) / NULLIF({}, 0), {} DESC, a.player_name",
            goals_calculation, goals_calculation
        ),
        MINUTES_PER_ASSIST => "SUM(a.minutes_played) / NULLIF(SUM(a.assists), 0), SUM(a.assists) DESC, a.player_name".to_string(),
        MINUTES_PER_GOAL_OR_ASSIST => format!(
            "SUM(a.minutes_played) / NULLIF({} + SUM(a.assists), 0), a.player_name",
            goals_calculation
        ),
        MINUTES_PER_YELLOW => "SUM(a.minutes_played) / NULLIF(SUM(a.yellow_cards), 0), SUM(a.yellow_cards) DESC, a.player_name".to_string(),
        MINUTES_PER_RED => if from_events_table {
            "SUM(a.minutes_played) / NULLIF(SUM(a.red_cards), 0), SUM(a.red_cards) DESC, a.player_name".to_string()
        } else {
            "SUM(a.minutes_played) / NULLIF((SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END)), 0),
            SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END) DESC, a.player_name".to_string()
        }
        _ => format!(
            "{} DESC, SUM(a.assists) DESC, SUM(a.minutes_played) ASC, SUM(a.red_cards) ASC, SUM(a.yellow_cards) ASC, a.player_name",
            goals_calculation
        )
    };

    query.push(sort_clause);
}

pub fn add_limit_and_offset_to_query(query: &mut QueryBuilder<Postgres>, limit: i32, page: i32) {
    query.push("
    LIMIT ").push_bind(limit);

    query.push("
    OFFSET ").push_bind(page * limit);
}
