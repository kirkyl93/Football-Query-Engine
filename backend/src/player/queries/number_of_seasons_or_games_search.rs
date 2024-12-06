use actix_web::{get, web, HttpResponse};
use sqlx::{PgPool, Postgres, QueryBuilder};
use crate::player::queries::shared_sql_helper::{add_ages_to_query, add_clubs_played_against_to_query, add_clubs_played_for_to_query, add_competitions_to_query, add_height_to_query, add_home_away_to_query, add_limit_and_offset_to_query, add_player_countries_to_query, add_player_names_to_query, add_positions_to_query, add_seasons_to_query, add_sub_info_to_query, construct_appearances_table_from_game_events, goals_query_string};
use crate::player::search_models::{ProcessedSearchParams, SearchParams, StatScope};
use crate::player::search_models::SortOption::NumberOfSeasonsWith;
use crate::player::sql_models::PlayerNumberOfGamesOrSeasonsResult;

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

fn construct_number_of_games_or_seasons_query_from_params<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    if params.minute_played_from() == 0 && params.minute_played_to() == 120 {
        if *params.sort() == NumberOfSeasonsWith {
            return build_number_of_seasons_query_from_appearances(params);
        }
        return build_number_of_games_query_from_appearances(params);

    } else {
        if *params.sort() == NumberOfSeasonsWith {
            return build_number_of_seasons_query_from_events(params);
        }
        return build_number_of_games_query_from_events(params);
    }
}

fn build_number_of_seasons_query_from_events<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let mut query = QueryBuilder::new("");

    construct_appearances_table_from_game_events(&mut query, &params);

    let goals_calculation = goals_query_string(params.penalties(), false);

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

    add_minimum_season_goals_to_query(&mut query, params.minimum_goals());
    add_maximum_season_goals_to_query(&mut query, params.maximum_goals());
    add_minimum_season_assists_to_query(&mut query, params.minimum_assists());
    add_maximum_season_assists_to_query(&mut query, params.maximum_assists());

    query.push("
    GROUP BY
        ps.player_id, ps.player_name, ps.image_url, ps.country_of_citizenship, ps.sub_position
    ORDER BY
        number_of_seasons DESC, ps.player_name");

    add_limit_and_offset_to_query(&mut query, params.limit(), params.page());

    return query;
}

fn build_number_of_games_query_from_appearances<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let goals_calculation = goals_query_string(params.penalties(), true);

    let mut query = QueryBuilder::new("
    SELECT
        RANK() OVER (ORDER BY COUNT(DISTINCT a.game_id) DESC) AS rank,
        a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position,
        STRING_AGG(DISTINCT c.club_id::TEXT, ', ') AS clubs_played_for,
        COUNT(DISTINCT a.game_id) AS number_of_games");

    if *params.scope() == StatScope::Season {
        query.push(", g.season AS season");
    }

    query.push("
    FROM
        appearances_enhanced a
    JOIN
        clubs c ON c.club_id = a.player_club_id
    JOIN
        players p on p.player_id = a.player_id
    JOIN
        games g ON g.game_id = a.game_id
    WHERE 1 = 1");

    add_minimum_game_goals_to_query(&mut query, goals_calculation.clone(), params.minimum_goals());
    add_maximum_game_goals_to_query(&mut query, goals_calculation.clone(), params.maximum_goals());
    add_minimum_game_assists_to_query(&mut query, params.minimum_assists());
    add_maximum_game_assists_to_query(&mut query, params.maximum_assists());

    add_seasons_to_query(&mut query, params.seasons().clone());
    add_competitions_to_query(&mut query, params.competitions().clone());
    add_positions_to_query(&mut query, params.positions().clone());
    add_ages_to_query(&mut query, params.minimum_age(), params.maximum_age());
    add_height_to_query(&mut query, params.minimum_height(), params.maximum_height());
    add_home_away_to_query(&mut query, params.home_or_away());
    add_player_names_to_query(&mut query, params.names());
    add_player_countries_to_query(&mut query, params.countries().clone());
    add_clubs_played_for_to_query(&mut query, params.clubs_played_for().clone());
    add_clubs_played_against_to_query(&mut query, params.clubs_played_against().clone());
    add_sub_info_to_query(&mut query, params.subs_only(), params.earliest_sub_on_time(), params.latest_sub_on_time());

    query.push("
    GROUP BY
        a.player_id, player_name, image_url, country_of_citizenship, sub_position");

    if *params.scope() == StatScope::Season {
        query.push(", g.season");
    }

    query.push("
    ORDER BY
        number_of_games DESC, player_name");

    add_limit_and_offset_to_query(&mut query, params.limit(), params.page());

    return query;
}

fn build_number_of_games_query_from_events<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let mut query = QueryBuilder::new("");

    construct_appearances_table_from_game_events(&mut query, &params);

    let goals_calculation = goals_query_string(params.penalties(), true);

    query.push("

    SELECT
        RANK() OVER (ORDER BY COUNT(DISTINCT a.game_id) DESC) AS rank,
        a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position,
        STRING_AGG(DISTINCT c.club_id::TEXT, ', ') AS clubs_played_for,
        COUNT(DISTINCT a.game_id) AS number_of_games");

    if *params.scope() == StatScope::Season {
        query.push(", g.season AS season");
    }

    query.push("
    FROM
        games_minute_appearance_filter a
    JOIN
        clubs c ON c.club_id = a.club_id
    JOIN
        players p on p.player_id = a.player_id
    JOIN
        games g ON g.game_id = a.game_id
    WHERE 1 = 1");

    add_minimum_game_goals_to_query(&mut query, goals_calculation.clone(), params.minimum_goals());
    add_maximum_game_goals_to_query(&mut query, goals_calculation.clone(), params.maximum_goals());
    add_minimum_game_assists_to_query(&mut query, params.minimum_assists());
    add_maximum_game_assists_to_query(&mut query, params.maximum_assists());

    query.push("
    GROUP BY
        a.player_id, player_name, p.image_url, p.country_of_citizenship, p.sub_position");

    if *params.scope() == StatScope::Season {
        query.push(", g.season");
    }

    query.push("
    ORDER BY
        number_of_games DESC, player_name");

    add_limit_and_offset_to_query(&mut query, params.limit(), params.page());

    return query;
}

fn build_number_of_seasons_query_from_appearances<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let goals_calculation = goals_query_string(params.penalties(), false);

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

    add_seasons_to_query(&mut query, params.seasons().clone());
    add_competitions_to_query(&mut query, params.competitions().clone());
    add_positions_to_query(&mut query, params.positions().clone());
    add_ages_to_query(&mut query, params.minimum_age(), params.maximum_age());
    add_height_to_query(&mut query, params.minimum_height(), params.maximum_height());
    add_home_away_to_query(&mut query, params.home_or_away());
    add_player_names_to_query(&mut query, params.names());
    add_player_countries_to_query(&mut query, params.countries().clone());
    add_clubs_played_for_to_query(&mut query, params.clubs_played_for().clone());
    add_clubs_played_against_to_query(&mut query, params.clubs_played_against().clone());
    add_sub_info_to_query(&mut query, params.subs_only(), params.earliest_sub_on_time(), params.latest_sub_on_time());

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

    add_minimum_season_goals_to_query(&mut query, params.minimum_goals());
    add_maximum_season_goals_to_query(&mut query, params.maximum_goals());
    add_minimum_season_assists_to_query(&mut query, params.minimum_assists());
    add_maximum_season_assists_to_query(&mut query, params.maximum_assists());

    query.push("
    GROUP BY
        ps.player_id, ps.player_name, ps.image_url, ps.country_of_citizenship, ps.sub_position
    ORDER BY
        number_of_seasons DESC, ps.player_name");

    add_limit_and_offset_to_query(&mut query, params.limit(), params.page());

    return query;
}

pub fn add_minimum_season_goals_to_query(query: &mut QueryBuilder<Postgres>, minimum_goals: i32) {
    if minimum_goals > 0 {
        query.push("
    AND total_goals >= ").push(minimum_goals);
    }
}

pub fn add_maximum_season_goals_to_query(query: &mut QueryBuilder<Postgres>, maximum_goals: i32) {
    if maximum_goals > 0 {
        query.push("
    AND total_goals <= ").push(maximum_goals);
    }
}

pub fn add_minimum_season_assists_to_query(query: &mut QueryBuilder<Postgres>, minimum_assists: i32) {
    if minimum_assists > 0 {
        query.push("
    AND total_assists >= ").push(minimum_assists);
    }
}

pub fn add_maximum_season_assists_to_query(query: &mut QueryBuilder<Postgres>, maximum_assists: i32) {
    if maximum_assists > 0 {
        query.push("
    AND total_assists <= ").push(maximum_assists);
    }
}

pub fn add_minimum_game_goals_to_query(query: &mut QueryBuilder<Postgres>, goals_calculation: String, minimum_goals: i32) {
    if minimum_goals > 0 {
        query.push("
    AND ").push(goals_calculation).push(" >= ").push(minimum_goals);
    }
}

pub fn add_maximum_game_goals_to_query(query: &mut QueryBuilder<Postgres>, goals_calculation: String, maximum_goals: i32) {
    if maximum_goals > 0 {
        query.push("
    AND ").push(goals_calculation).push(" <= ").push(maximum_goals);
    }
}

pub fn add_minimum_game_assists_to_query(query: &mut QueryBuilder<Postgres>, minimum_assists: i32) {
    if minimum_assists > 0 {
        query.push("
    AND assists >= ").push(minimum_assists);
    }
}

pub fn add_maximum_game_assists_to_query(query: &mut QueryBuilder<Postgres>, maximum_assists: i32) {
    if maximum_assists > 0 {
        query.push("
    AND assists <= ").push(maximum_assists);
    }
}