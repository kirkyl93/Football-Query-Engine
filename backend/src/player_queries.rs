use actix_web::{
    get, web::{self, Path}, HttpResponse,
};
use serde::{Deserialize, Serialize};
use sqlx::{query, PgPool, Postgres, QueryBuilder};
use sqlx::query::Query;
use crate::player::{map_position_code_to_position, Player, PlayerGameSearchResult, PlayerNumberOfGamesOrSeasonsResult, PlayerSearchResult, PlayerSeasonByCompAndTeam};

// Penalty Options
pub const INCLUDE_PENALTIES: &str = "ip";
pub const EXCLUDE_PENALTIES: &str = "ep";
pub const ONLY_PENALTIES: &str = "op";

// Home or away Options

pub const HOME: &str = "h";
pub const AWAY: &str = "a";
pub const EITHER: &str = "e";

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
pub const NUMBER_OF_GAMES_WITH: &str = "gw";
pub const NUMBER_OF_SEASONS_WITH: &str = "sw";
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
    #[serde(rename = "maxage")]
    maximum_age: Option<i32>,
    #[serde(rename = "minheight")]
    minimum_height: Option<i32>,
    #[serde(rename = "maxheight")]
    maximum_height: Option<i32>,
    names: Option<String>,
    #[serde(rename = "clubspf")]
    clubs_played_for: Option<String>,
    #[serde(rename = "clubspa")]
    clubs_played_against: Option<String>,
    #[serde(rename = "subonly")]
    subs_only: Option<i32>,
    #[serde(rename = "earliestsub")]
    earliest_sub_on_time: Option<i32>,
    #[serde(rename = "latestsub")]
    latest_sub_on_time: Option<i32>,
    penalty: Option<String>,
    #[serde(rename = "home")]
    home_or_away: Option<String>,
    scope: Option<String>,
    sort: Option<String>,
    #[serde(rename = "ma")]
    minimum_appearances: Option<i32>,
    #[serde(rename = "ming")]
    minimum_goals: Option<i32>,
    #[serde(rename = "maxg")]
    maximum_goals: Option<i32>,
    #[serde(rename = "mina")]
    minimum_assists: Option<i32>,
    #[serde(rename = "maxa")]
    maximum_assists: Option<i32>
}

impl SearchParams {
    fn to_processed(&self) -> Result<ProcessedSearchParams, String> {
        let seasons: Vec<i32> = self.seasons
            .as_ref()
            .map(|s| s.split(',').filter_map(|s| s.parse().ok()).collect())
            .unwrap_or_else(Vec::new);

        let competitions: Vec<String> = self.competitions
            .as_ref()
            .map(|c| c.split(',').map(String::from).collect())
            .unwrap_or_else(Vec::new);

        let positions: Vec<String> = self.positions
            .as_ref()
            .map(|p| p.split(',').map(|s| map_position_code_to_position(s)).map(String::from).collect())
            .unwrap_or_else(Vec::new);

        let names: Vec<String> = self.names
            .as_ref()
            .map(|p| p.split(',').map(String::from).collect())
            .unwrap_or_else(Vec::new);

        let clubs_played_for: Vec<i32> = self.clubs_played_for
            .as_ref()
            .map(|s| s.split(',').filter_map(|s| s.parse().ok()).collect())
            .unwrap_or_else(Vec::new);

        let clubs_played_against: Vec<i32> = self.clubs_played_against
            .as_ref()
            .map(|s| s.split(',').filter_map(|s| s.parse().ok()).collect())
            .unwrap_or_else(Vec::new);

        Ok(ProcessedSearchParams {
            page: self.page.unwrap_or(0),
            limit: self.limit.unwrap_or(50).min(100),
            seasons,
            competitions,
            positions,
            minute_played_from: self.minute_played_from.unwrap_or(0).min(120),
            minute_played_to: self.minute_played_to.unwrap_or(120).max(0),
            minimum_age: self.minimum_age.unwrap_or(0),
            maximum_age: self.maximum_age.unwrap_or(0),
            minimum_height: self.minimum_height.unwrap_or(0),
            maximum_height: self.maximum_height.unwrap_or(0),
            names,
            clubs_played_for,
            clubs_played_against,
            subs_only: self.subs_only.unwrap_or(0),
            earliest_sub_on_time: self.earliest_sub_on_time.unwrap_or(0),
            latest_sub_on_time: self.latest_sub_on_time.unwrap_or(0),
            penalties: self.penalty.clone().unwrap_or_else(|| INCLUDE_PENALTIES.into()),
            home_or_away: self.home_or_away.clone().unwrap_or_else(|| EITHER.into()),
            scope: self.scope.clone().unwrap_or_else(|| OVERALL.into()),
            sort: self.sort.clone().unwrap_or_else(|| GOALS.into()),
            minimum_appearances: self.minimum_appearances.unwrap_or(0),
            minimum_goals: self.minimum_goals.unwrap_or(0),
            maximum_goals: self.maximum_goals.unwrap_or(0),
            minimum_assists: self.minimum_assists.unwrap_or(0),
            maximum_assists: self.maximum_assists.unwrap_or(0)
        })
    }
}

struct ProcessedSearchParams {
    page: i32,
    limit: i32,
    seasons: Vec<i32>,
    competitions: Vec<String>,
    positions: Vec<String>,
    minute_played_from: i32,
    minute_played_to: i32,
    minimum_age: i32,
    maximum_age: i32,
    minimum_height: i32,
    maximum_height: i32,
    names: Vec<String>,
    clubs_played_for: Vec<i32>,
    clubs_played_against: Vec<i32>,
    subs_only: i32,
    earliest_sub_on_time: i32,
    latest_sub_on_time: i32,
    penalties: String,
    home_or_away: String,
    scope: String,
    sort: String,
    minimum_appearances: i32,
    minimum_goals: i32,
    maximum_goals: i32,
    minimum_assists: i32,
    maximum_assists: i32
}

#[get("/search")]
pub async fn search(pool: web::Data<PgPool>, params: web::Query<SearchParams>) -> HttpResponse {
    match params.to_processed() {
        Ok(search_params) => {
            let mut query = construct_search_query_from_params(search_params);
            println!("{}", query.sql());
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
        Err(e) => {
            eprintln!("Error processing search parameters: {}", e);
            HttpResponse::BadRequest().body(e)
        }
    }


}

#[get("/search/game")]
pub async fn game_search(pool: web::Data<PgPool>, params: web::Query<SearchParams>) -> HttpResponse {
    match params.to_processed() {
        Ok(game_search_params) => {
            let mut query = construct_game_search_query_from_params(game_search_params);
            match query.build_query_as::<PlayerGameSearchResult>()
                .fetch_all(pool.get_ref())
                .await
            {
                Ok(game_search_results) => HttpResponse::Ok().json(game_search_results),
                Err(err) => {
                    println!("{:?}", err.as_database_error());
                    HttpResponse::InternalServerError().json(err.to_string())
                }
            }
        }
        Err(e) => {
            eprintln!("Error processing search parameters: {}", e);
            HttpResponse::BadRequest().body(e)
        }
    }
}

#[get("/search/occurrences")]
pub async fn number_of_games_or_seasons_search(pool: web::Data<PgPool>, params: web::Query<SearchParams>) -> HttpResponse {
    match params.to_processed() {
        Ok(games_or_seasons_search_params) => {
            let mut query = construct_number_of_games_or_seasons_query_from_params(games_or_seasons_search_params);
            println!("{}", query.sql());
            match query.build_query_as::<PlayerNumberOfGamesOrSeasonsResult>()
                .fetch_all(pool.get_ref())
                .await
            {
                Ok(games_or_seasons_results) => HttpResponse::Ok().json(games_or_seasons_results),
                Err(err) => {
                    println!("{:?}", err.as_database_error());
                    HttpResponse::InternalServerError().json(err.to_string())
                }
            }
        }
        Err(e) => {
            eprintln!("Error processing search parameters: {}", e);
            HttpResponse::BadRequest().body(e)
        }
    }
}



fn construct_search_query_from_params<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    if params.minute_played_from == 0 && params.minute_played_to == 120 {
        return build_query_from_appearances(params);
    }

    return build_query_from_events(params);
}

fn construct_number_of_games_or_seasons_query_from_params<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    if params.minute_played_from == 0 && params.minute_played_to == 120 {
        if params.sort == NUMBER_OF_SEASONS_WITH {
            return build_number_of_seasons_query_from_appearances(params);
        }
    }
    return build_number_of_seasons_query_from_events(params);


    // if params.sort == NUMBER_OF_SEASONS_WITH {
    //     return build_number_of_games_query_from_appearances(params);
    // }
    //
    // return build_number_of_games_query_from_events(params);
}

fn construct_game_search_query_from_params<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    if params.minute_played_from == 0 && params.minute_played_to == 120 {
        return build_game_query_from_appearances(params);
    }

    return build_game_query_from_events(params);
}

fn build_game_query_from_events<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let mut query = QueryBuilder::new("");

    construct_appearances_table_from_game_events(&mut query, &params);

    let goals_calculation = goals_query_string(params.penalties, true);

    query.push("
    SELECT ");

    add_game_rank_to_query(&mut query, &params.sort, &goals_calculation);

    query.push("a.player_id, player_name, country_of_citizenship, sub_position, image_url, club_id,
    c.competition_id, c.name AS competition_name, c.country_name AS competition_country, date, season, home_club_id, home_club_name,
    home_club_goals, away_club_id, away_club_name, away_club_goals, minutes_played, goals, assists");

    query.push("
    FROM
        games_minute_appearance_filter a
    JOIN
        games ON a.game_id = games.game_id
    JOIN
        competitions c ON c.competition_id = games.competition_id"
    );

    add_game_order_by_to_query(&mut query, params.sort, goals_calculation);
    add_limit_and_offset_to_query(&mut query, params.limit, params.page);

    return query;
}

fn build_number_of_seasons_query_from_events<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let mut query = QueryBuilder::new("");

    construct_appearances_table_from_game_events(&mut query, &params);

    let goals_calculation = goals_query_string(params.penalties, false);

    query.push(",

player_season_goals AS (
    SELECT a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, ARRAY_AGG(DISTINCT c.club_id) AS unique_clubs_played_for,
    g.season, ");

    query.push(goals_calculation).push(" AS total_goals, SUM(a.assists) AS total_assists
    FROM
        games_minute_appearance_filter a
    JOIN
        clubs c ON c.club_id = a.club_id
    JOIN
        players p ON p.player_id = a.player_id
    JOIN
        games g ON g.game_id = a.game_id
    WHERE appearances > 0");

    query.push("
    GROUP BY a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, g.season
)
    ");

    query.push("
    SELECT
        RANK() OVER (ORDER BY COUNT(DISTINCT ps.season) DESC) AS rank,
        ps.player_id, ps.player_name, ps.image_url, ps.country_of_citizenship, ps.sub_position,
        STRING_AGG(DISTINCT club_id::TEXT, ', ') AS clubs_played_for,
        COUNT(DISTINCT ps.season) AS number_of_seasons
    FROM
        player_season_goals ps,
        LATERAL UNNEST(ps.unique_clubs_played_for) AS club_id
    WHERE
        1 = 1");

    add_minimum_season_goals_to_query(&mut query, params.minimum_goals);
    add_maximum_season_goals_to_query(&mut query, params.maximum_goals);
    add_minimum_season_assists_to_query(&mut query, params.minimum_assists);
    add_maximum_season_assists_to_query(&mut query, params.maximum_assists);

    query.push("
    GROUP BY
        ps.player_id, ps.player_name, ps.image_url, ps.country_of_citizenship, ps.sub_position
    ORDER BY
        number_of_seasons DESC, ps.player_name");

    add_limit_and_offset_to_query(&mut query, params.limit, params.page);

    return query;






}

fn build_query_from_events<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let mut query = QueryBuilder::new("");

    construct_appearances_table_from_game_events(&mut query, &params);

    let goals_calculation = goals_query_string(params.penalties, false);

    query.push("
    SELECT ");

    add_rank_to_query(&mut query, &params.sort, &goals_calculation, true);

    query.push("player_id, player_name, image_url, country_of_citizenship, sub_position,
    COUNT(*) AS total_appearances,
    SUM(substitute_appearances) AS substitute_appearances,
	");

    query.push(&goals_calculation).push(" AS total_goals,");

    query.push("
    SUM(assists) AS total_assists,
    SUM(yellow_cards) AS total_yellow_cards,
    SUM(red_cards) AS total_red_cards,
    SUM(minutes_played) AS total_minutes_played,
    STRING_AGG(DISTINCT a.club_id::TEXT, ', ') AS clubs_played_for,");
    if params.scope == SEASON {
        query.push("
    a.season AS season,");
    }

    add_minutes_per_event_calculations(&mut query, &goals_calculation, true);

    query.push("
    FROM
        games_minute_appearance_filter a
        WHERE appearances > 0");

    add_group_by_to_query(&mut query, params.scope == SEASON);
    add_minimum_appearances_to_query(&mut query, params.minimum_appearances);
    add_order_by_to_query(&mut query, params.sort, goals_calculation, true, params.scope == SEASON);
    add_limit_and_offset_to_query(&mut query, params.limit, params.page);

    return query;
}

fn build_game_query_from_appearances<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let goals_calculation = goals_query_string(params.penalties, true);

    let mut query = QueryBuilder::new("SELECT ");

    add_game_rank_to_query(&mut query, &params.sort, &goals_calculation);

    query.push("a.player_id, player_name, country_of_citizenship, sub_position, image_url, player_club_id AS club_id,
    a.competition_id, c.name AS competition_name, c.country_name AS competition_country, a.date, season, home_club_id, home_club_name, home_club_goals, away_club_id, away_club_name,
    away_club_goals, minutes_played, goals, assists");

    query.push("
    FROM
        appearances_enhanced a
    JOIN
        games g ON a.game_id = g.game_id
    JOIN
        players p ON a.player_id = p.player_id
    JOIN
        competitions c ON a.competition_id = c.competition_id
    WHERE 1 = 1");

    add_seasons_to_query(&mut query, params.seasons);
    add_competitions_to_query(&mut query, params.competitions);
    add_positions_to_query(&mut query, params.positions);
    add_ages_to_query(&mut query, params.minimum_age, params.maximum_age);
    add_height_to_query(&mut query, params.minimum_height, params.maximum_height);
    add_home_away_to_query(&mut query, params.home_or_away);
    add_player_names_to_query(&mut query, params.names);
    add_clubs_played_for_to_query(&mut query, params.clubs_played_for);
    add_clubs_played_against_to_query(&mut query, params.clubs_played_against);
    add_sub_info_to_query(&mut query, params.subs_only, params.earliest_sub_on_time, params.latest_sub_on_time);

    add_game_order_by_to_query(&mut query, params.sort, goals_calculation);
    add_limit_and_offset_to_query(&mut query, params.limit, params.page);

    return query;
}



fn build_number_of_seasons_query_from_appearances<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let goals_calculation = goals_query_string(params.penalties, false);

    let mut query = QueryBuilder::new("
WITH player_season_goals AS (
    SELECT a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, ARRAY_AGG(DISTINCT c.club_id) AS unique_clubs_played_for,
    g.season, ");

    query.push(goals_calculation).push(" AS total_goals, SUM(a.assists) AS total_assists
    FROM
        appearances_enhanced a
    JOIN
        clubs c ON c.club_id = a.player_club_id
    JOIN
        players p on p.player_id = a.player_id
    JOIN
        games g ON g.game_id = a.game_id
    WHERE 1 = 1");

    add_seasons_to_query(&mut query, params.seasons);
    add_competitions_to_query(&mut query, params.competitions);
    add_positions_to_query(&mut query, params.positions);
    add_ages_to_query(&mut query, params.minimum_age, params.maximum_age);
    add_height_to_query(&mut query, params.minimum_height, params.maximum_height);
    add_home_away_to_query(&mut query, params.home_or_away);
    add_player_names_to_query(&mut query, params.names);
    add_clubs_played_for_to_query(&mut query, params.clubs_played_for);
    add_clubs_played_against_to_query(&mut query, params.clubs_played_against);
    add_sub_info_to_query(&mut query, params.subs_only, params.earliest_sub_on_time, params.latest_sub_on_time);

    query.push("
    GROUP BY a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, g.season
)
    ");

    query.push("
    SELECT
        RANK() OVER (ORDER BY COUNT(DISTINCT ps.season) DESC) AS rank,
        ps.player_id, ps.player_name, ps.image_url, ps.country_of_citizenship, ps.sub_position,
        STRING_AGG(DISTINCT club_id::TEXT, ', ') AS clubs_played_for,
        COUNT(DISTINCT ps.season) AS number_of_seasons
    FROM
        player_season_goals ps,
        LATERAL UNNEST(ps.unique_clubs_played_for) AS club_id
    WHERE
        1 = 1");

    add_minimum_season_goals_to_query(&mut query, params.minimum_goals);
    add_maximum_season_goals_to_query(&mut query, params.maximum_goals);
    add_minimum_season_assists_to_query(&mut query, params.minimum_assists);
    add_maximum_season_assists_to_query(&mut query, params.maximum_assists);

    query.push("
    GROUP BY
        ps.player_id, ps.player_name, ps.image_url, ps.country_of_citizenship, ps.sub_position
    ORDER BY
        number_of_seasons DESC, ps.player_name");

    add_limit_and_offset_to_query(&mut query, params.limit, params.page);

    return query;
}

fn build_query_from_appearances<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let goals_calculation = goals_query_string(params.penalties, false);

    let mut query = QueryBuilder::new("SELECT ");

    add_rank_to_query(&mut query, &params.sort, &goals_calculation, false);

    query.push("
    a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position,
    COUNT(*) AS total_appearances,
    SUM(CASE WHEN a.played_from_minute > 0 THEN 1 ELSE 0 END) AS substitute_appearances,
    ");

    query.push(&goals_calculation).push(" AS total_goals,");

    query.push("
    SUM(a.assists) AS total_assists,
    SUM(a.yellow_cards) AS total_yellow_cards,
    SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END) AS total_red_cards,
    SUM(a.minutes_played) AS total_minutes_played,
    STRING_AGG(DISTINCT c.club_id::TEXT, ', ') AS clubs_played_for,");
    if params.scope == SEASON {
        query.push("
    g.season AS season,");
    }

    add_minutes_per_event_calculations(&mut query, &goals_calculation, false);

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

    add_seasons_to_query(&mut query, params.seasons);
    add_competitions_to_query(&mut query, params.competitions);
    add_positions_to_query(&mut query, params.positions);
    add_ages_to_query(&mut query, params.minimum_age, params.maximum_age);
    add_height_to_query(&mut query, params.minimum_height, params.maximum_height);
    add_home_away_to_query(&mut query, params.home_or_away);
    add_player_names_to_query(&mut query, params.names);
    add_clubs_played_for_to_query(&mut query, params.clubs_played_for);
    add_clubs_played_against_to_query(&mut query, params.clubs_played_against);
    add_sub_info_to_query(&mut query, params.subs_only, params.earliest_sub_on_time, params.latest_sub_on_time);

    add_group_by_to_query(&mut query, params.scope == SEASON);
    add_minimum_appearances_to_query(&mut query, params.minimum_appearances);
    add_order_by_to_query(&mut query, params.sort, goals_calculation, false, params.scope == SEASON);
    add_limit_and_offset_to_query(&mut query, params.limit, params.page);

    return query;
}


fn goals_query_string(penalties: String, game_query: bool) -> String {
    if game_query {
        match penalties.as_str() {
            EXCLUDE_PENALTIES => "goals - penalty_goals".into(),
            ONLY_PENALTIES => "penalty_goals".into(),
            _ => "goals".into()
        }
    } else {
        match penalties.as_str() {
            EXCLUDE_PENALTIES => "SUM(a.goals) - SUM(a.penalty_goals)".into(),
            ONLY_PENALTIES => "SUM(a.penalty_goals)".into(),
            _ => "SUM(a.goals)".into()
        }
    }
}


fn construct_appearances_table_from_game_events(query: &mut QueryBuilder<Postgres>, params: &ProcessedSearchParams) {
    query.push("
    WITH games_minute_appearance_filter AS
    (SELECT a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, c.club_id, g.game_id,");

    if params.scope == SEASON {
        query.push(" g.season AS season,");
    }

    add_appearances_minute_filter_to_query(query, params.minute_played_from, params.minute_played_to);

    query.push("
    MIN(CASE WHEN a.played_from_minute > 0 THEN 1 ELSE 0 END) AS substitute_appearances,");

    add_goals_minute_filter_to_query(query, params.minute_played_from, params.minute_played_to);
    add_penalties_minute_filter_to_query(query, params.minute_played_from, params.minute_played_to);
    add_assists_minute_filter_to_query(query, params.minute_played_from, params.minute_played_to);
    add_yellows_minute_filter_to_query(query, params.minute_played_from, params.minute_played_to);
    add_reds_minute_filter_to_query(query, params.minute_played_from, params.minute_played_to);
    add_minutes_played_minute_filter_to_query(query, params.minute_played_from, params.minute_played_to);

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

    add_seasons_to_query(query, params.seasons.clone());
    add_competitions_to_query(query, params.competitions.clone());
    add_positions_to_query(query, params.positions.clone());
    add_ages_to_query(query, params.minimum_age, params.maximum_age);
    add_height_to_query(query, params.minimum_height, params.maximum_height);
    add_home_away_to_query(query, params.home_or_away.clone());
    add_player_names_to_query(query, params.names.clone());
    add_clubs_played_for_to_query(query, params.clubs_played_for.clone());
    add_clubs_played_against_to_query(query, params.clubs_played_against.clone());
    add_sub_info_to_query(query, params.subs_only, params.earliest_sub_on_time, params.latest_sub_on_time);

    query.push("
    GROUP BY a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, c.club_id, g.game_id)

    ");
}

fn add_minutes_per_event_calculations(query: &mut QueryBuilder<Postgres>, goals_calculation: &String, from_events_table: bool) {
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



fn add_game_rank_to_query(query: &mut QueryBuilder<Postgres>, sort_by: &String, goals_calculation: &String) {
    query.push("RANK() OVER (ORDER BY ");
    let rank_order = match sort_by.as_str() {
        GOALS => format!("{} DESC", goals_calculation),
        ASSISTS => "assists DESC".into(),
        GOALS_AND_ASSISTS => format!(
            "assists + {} DESC",
            goals_calculation
        ),
        _ => format!("{} DESC", goals_calculation)
    };

    query.push(rank_order).push("), ");
}

fn add_rank_to_query(query: &mut QueryBuilder<Postgres>, sort_by: &String, goals_calculation: &String, from_events_table: bool) {
    query.push("RANK() OVER (ORDER BY ");
    let rank_order = match sort_by.as_str() {
        GOALS => format!("{} DESC", goals_calculation),
        ASSISTS => "SUM(a.assists) DESC".into(),
        GOALS_AND_ASSISTS => format!(
            "SUM(a.assists) + {} DESC",
            goals_calculation
        ),
        APPEARANCES => "COUNT(*) DESC".into(),
        MINUTES_PLAYED => "SUM(a.minutes_played) DESC".into(),
        YELLOW_CARDS => "SUM(a.yellow_cards) DESC".into(),
        RED_CARDS => if from_events_table {
            "SUM(a.red_cards) DESC".into()
        } else {
            "SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END) DESC".into()
        },
        MINUTES_PER_GOAL => format!(
            "SUM(a.minutes_played) / NULLIF({}, 0)",
            goals_calculation
        ),
        MINUTES_PER_ASSIST => "SUM(a.minutes_played) / NULLIF(SUM(a.assists), 0)".into(),
        MINUTES_PER_GOAL_OR_ASSIST => format!(
            "SUM(a.minutes_played) / NULLIF({} + SUM(a.assists), 0)",
            goals_calculation
        ),
        MINUTES_PER_YELLOW => "SUM(a.minutes_played) / NULLIF(SUM(a.yellow_cards), 0)".into()
        ,
        MINUTES_PER_RED => if from_events_table {
            "SUM(a.minutes_played) / NULLIF(SUM(a.red_cards), 0)".into()
        } else {
            "SUM(a.minutes_played) / NULLIF((SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END)), 0)".into()
        },
        _ => format!("{} DESC", goals_calculation)
    };

    query.push(rank_order).push("), ");
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

fn add_competitions_to_query(query: &mut QueryBuilder<Postgres>, competitions: Vec<String>) {
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

fn add_positions_to_query(query: &mut QueryBuilder<Postgres>, positions: Vec<String>) {
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

fn add_home_away_to_query(query: &mut QueryBuilder<Postgres>, home_or_away: String) {
    let home_or_away = match home_or_away.as_str() {
        HOME => "
        AND player_club_id = home_club_id",
        AWAY => "
        AND player_club_id = away_club_id",
        _ => ""
    };

    if !home_or_away.is_empty() {
        query.push(home_or_away);
    }
}

fn add_height_to_query(query: &mut QueryBuilder<Postgres>, min_height: i32, max_height: i32) {
    if min_height > 0 {
        query.push("
        AND height_in_cm >= ").push_bind(min_height);
    }

    if max_height > 0 {
        query.push("
        AND height_in_cm <= ").push_bind(max_height);
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

fn add_player_names_to_query(query: &mut QueryBuilder<Postgres>, player_names: Vec<String>) {
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

fn add_minimum_season_goals_to_query(query: &mut QueryBuilder<Postgres>, minimum_goals: i32) {
    if minimum_goals > 0 {
        query.push("
    AND total_goals >= ").push(minimum_goals);
    }
}

fn add_maximum_season_goals_to_query(query: &mut QueryBuilder<Postgres>, maximum_goals: i32) {
    if maximum_goals > 0 {
        query.push("
    AND total_goals <= ").push(maximum_goals);
    }
}

fn add_minimum_season_assists_to_query(query: &mut QueryBuilder<Postgres>, minimum_assists: i32) {
    if minimum_assists > 0 {
        query.push("
    AND total_assists >= ").push(minimum_assists);
    }
}

fn add_maximum_season_assists_to_query(query: &mut QueryBuilder<Postgres>, maximum_assists: i32) {
    if maximum_assists > 0 {
        query.push("
    AND total_assists <= ").push(maximum_assists);
    }
}

fn add_game_order_by_to_query(query: &mut QueryBuilder<Postgres>, sort_by: String, goals_calculation: String) {
    query.push("
    ORDER BY ");

    let sort_clause = match sort_by.as_str() {
        GOALS => format!(
            "{} DESC, assists DESC, minutes_played ASC, red_cards ASC, yellow_cards ASC, player_name, season",
            goals_calculation
        ),
        ASSISTS => format!(
            "assists DESC, {} DESC, a.player_name, season",
            goals_calculation
        ),
        GOALS_AND_ASSISTS => format!(
            "a.assists + {} DESC, a.player_name, season",
            goals_calculation
        ),
        _ => format!(
            "{} DESC, assists DESC, minutes_played ASC, red_cards ASC, yellow_cards ASC, player_name, season",
            goals_calculation
        )
    };

    query.push(sort_clause);
}

fn add_order_by_to_query(query: &mut QueryBuilder<Postgres>, sort_by: String, goals_calculation: String, from_events_table: bool, season_scope: bool) {
    query.push("
    ORDER BY ");

    let sort_clause = match sort_by.as_str() {
        GOALS => format!(
            "{} DESC, SUM(a.assists) DESC, SUM(a.minutes_played) ASC, SUM(a.red_cards) ASC, SUM(a.yellow_cards) ASC, a.player_name",
            goals_calculation
        ),
        ASSISTS => format!(
            "SUM(a.assists) DESC, {} DESC, a.player_name",
            goals_calculation
        ),
        GOALS_AND_ASSISTS => format!(
            "SUM(a.assists) + {} DESC, a.player_name",
            goals_calculation
        ),
        APPEARANCES => "COUNT(*) DESC, SUM(a.minutes_played) DESC, a.player_name".into(),
        MINUTES_PLAYED => "SUM(a.minutes_played) DESC, COUNT(*) DESC, a.player_name".into(),
        YELLOW_CARDS => "SUM(a.yellow_cards) DESC, SUM(a.red_cards) DESC, a.player_name".into(),
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
        MINUTES_PER_ASSIST => "SUM(a.minutes_played) / NULLIF(SUM(a.assists), 0), SUM(a.assists) DESC, a.player_name".into(),
        MINUTES_PER_GOAL_OR_ASSIST => format!(
            "SUM(a.minutes_played) / NULLIF({} + SUM(a.assists), 0), a.player_name",
            goals_calculation
        ),
        MINUTES_PER_YELLOW => "SUM(a.minutes_played) / NULLIF(SUM(a.yellow_cards), 0), SUM(a.yellow_cards) DESC, a.player_name".into(),
        MINUTES_PER_RED => if from_events_table {
            "SUM(a.minutes_played) / NULLIF(SUM(a.red_cards), 0), SUM(a.red_cards) DESC, a.player_name".into()
        } else {
            "SUM(a.minutes_played) / NULLIF((SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END)), 0),
            SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END) DESC, a.player_name".into()
        }
        _ => format!(
            "{} DESC, SUM(a.assists) DESC, SUM(a.minutes_played) ASC, SUM(a.red_cards) ASC, SUM(a.yellow_cards) ASC, a.player_name",
            goals_calculation
        )
    };

    query.push(sort_clause);

    if season_scope {
        query.push(", season");
    }
}

pub fn add_limit_and_offset_to_query(query: &mut QueryBuilder<Postgres>, limit: i32, page: i32) {
    query.push("
    LIMIT ").push_bind(limit);

    query.push("
    OFFSET ").push_bind(page * limit);
}
