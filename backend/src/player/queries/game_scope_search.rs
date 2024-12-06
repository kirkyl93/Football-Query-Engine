use actix_web::{get, web, HttpResponse};
use sqlx::{PgPool, Postgres, QueryBuilder};
use crate::player::queries::shared_sql_helper::{add_ages_to_query, add_clubs_played_against_to_query, add_clubs_played_for_to_query, add_competitions_to_query, add_height_to_query, add_home_away_to_query, add_limit_and_offset_to_query, add_player_countries_to_query, add_player_names_to_query, add_positions_to_query, add_seasons_to_query, add_sub_info_to_query, construct_appearances_table_from_game_events, goals_query_string};
use crate::player::search_models::{ProcessedSearchParams, SearchParams, SortOption};
use crate::player::sql_models::PlayerGameSearchResult;

#[get("/search/game")]
pub async fn game_search(pool: web::Data<PgPool>, params: web::Query<SearchParams>) -> HttpResponse {
    match params.to_processed() {
        Ok(game_search_params) => {
            let mut query = construct_query_from_params(game_search_params);
            println!("{}", query.sql());
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

fn construct_query_from_params<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    if params.minute_played_from() == 0 && params.minute_played_to() == 120 {
        return build_query_from_appearances(params);
    }

    return build_query_from_events(params);
}

fn build_query_from_appearances<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let goals_calculation = goals_query_string(params.penalties(), true);

    let mut query = QueryBuilder::new("SELECT ");

    add_game_rank_to_query(&mut query, params.sort(), &goals_calculation);

    query.push("a.player_id, player_name, country_of_citizenship, sub_position, image_url, player_club_id AS club_id,
    a.competition_id, c.name AS competition_name, c.country_name AS competition_country, a.date, season, home_club_id, home_club_name, home_club_goals, away_club_id, away_club_name,
    away_club_goals, minutes_played, ").push(goals_calculation.clone()).push(" AS goals, assists");

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

    add_game_order_by_to_query(&mut query, params.sort(), goals_calculation.clone());
    add_limit_and_offset_to_query(&mut query, params.limit(), params.page());

    return query;
}

fn build_query_from_events<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let mut query = QueryBuilder::new("");

    construct_appearances_table_from_game_events(&mut query, &params);

    let goals_calculation = goals_query_string(params.penalties(), true);

    query.push("
    SELECT ");

    add_game_rank_to_query(&mut query, params.sort(), &goals_calculation);

    query.push("a.player_id, player_name, country_of_citizenship, sub_position, image_url, club_id,
    c.competition_id, c.name AS competition_name, c.country_name AS competition_country, date, season, home_club_id, home_club_name,
    home_club_goals, away_club_id, away_club_name, away_club_goals, minutes_played, ").push(goals_calculation.clone()).push(" AS goals, assists");

    query.push("
    FROM
        games_minute_appearance_filter a
    JOIN
        games ON a.game_id = games.game_id
    JOIN
        competitions c ON c.competition_id = games.competition_id"
    );

    add_game_order_by_to_query(&mut query, params.sort(), goals_calculation);
    add_limit_and_offset_to_query(&mut query, params.limit(), params.page());

    return query;
}

pub fn add_game_rank_to_query(query: &mut QueryBuilder<Postgres>, sort_by: &SortOption, goals_calculation: &String) {
    query.push("RANK() OVER (ORDER BY ");
    let rank_order = match sort_by {
        SortOption::Goals => format!("{} DESC", goals_calculation),
        SortOption::Assists => "assists DESC".into(),
        SortOption::GoalsAndAssists => format!(
            "assists + {} DESC",
            goals_calculation
        ),
        _ => format!("{} DESC", goals_calculation)
    };

    query.push(rank_order).push("), ");
}

pub fn add_game_order_by_to_query(query: &mut QueryBuilder<Postgres>, sort_by: &SortOption, goals_calculation: String) {
    query.push("
    ORDER BY ");

    let sort_clause = match sort_by {
        SortOption::Goals => format!(
            "{} DESC, assists DESC, minutes_played ASC, red_cards ASC, yellow_cards ASC, player_name, season",
            goals_calculation
        ),
        SortOption::Assists => format!(
            "assists DESC, {} DESC, a.player_name, season",
            goals_calculation
        ),
        SortOption::GoalsAndAssists => format!(
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