use actix_web::{get, web, HttpResponse};
use sqlx::{PgPool, Postgres, QueryBuilder};
use crate::services::base_query_builder::BaseQueryMethods;
use crate::services::player::models::{ProcessedSearchParams, SearchParams, SortOption};
use crate::services::player::player_query_builder::{get_goals_calculation, PlayerMinuteFilterMethods, PlayerFilterMethods};
use crate::services::player::sql_models::PlayerGameSearchResult;

trait GameQueryMethods<'a> {
    fn add_rank(&mut self, sort_by: &SortOption, goals_calculation: &str) -> &mut Self;
    fn add_order_by(&mut self, sort_by: &SortOption, goals_calculation: &str) -> &mut Self;
}

impl<'a>  GameQueryMethods<'a>  for QueryBuilder<Postgres> {
    fn add_rank(&mut self, sort_by: &SortOption, goals_calculation: &str) -> &mut Self {
        self.push("RANK() OVER (ORDER BY ");
        let rank_order = match sort_by {
            SortOption::Goals => format!("{} DESC", goals_calculation),
            SortOption::Assists => "assists DESC".into(),
            SortOption::GoalsAndAssists => format!(
                "assists + {} DESC",
                goals_calculation
            ),
            _ => format!("{} DESC", goals_calculation)
        };
        self.push(rank_order).push("), ");

        self
    }

    fn add_order_by(&mut self, sort_by: &SortOption, goals_calculation: &str) -> &mut Self {
        self.push("
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
        self.push(sort_clause);

        self
    }
}

#[get("/search/game")]
pub async fn search_by_game(pool: web::Data<PgPool>, params: web::Query<SearchParams>) -> HttpResponse {
    match params.to_processed() {
        Ok(game_search_params) => {
            let mut query = construct_query_from_params(game_search_params);
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

fn construct_query_from_params<'a>(params: ProcessedSearchParams) -> QueryBuilder<Postgres> {
    if params.minute_played_from() == 0 && params.minute_played_to() == 120 {
        return build_query_from_appearances(params);
    }

    return build_query_from_events(params);
}

fn build_query_from_appearances<'a>(params: ProcessedSearchParams) -> QueryBuilder<Postgres> {
    let goals_calculation = get_goals_calculation(params.penalties(), true);

    let mut query = QueryBuilder::new("
    SELECT ");

    query.add_rank(params.sort(), goals_calculation)
        .push("a.player_id, player_name, country_of_citizenship, sub_position, image_url, player_club_id AS club_id,
        a.competition_id, c.name AS competition_name, c.country_name AS competition_country, a.date, season, home_club_id, home_club_name, home_club_goals, away_club_id, away_club_name,
        away_club_goals, minutes_played, ").push(goals_calculation).push(" AS goals, assists
        FROM
            appearances_enhanced a
        JOIN
            games g ON a.game_id = g.game_id
        JOIN
            players p ON a.player_id = p.player_id
        JOIN
            competitions c ON a.competition_id = c.competition_id
        WHERE 1 = 1")
        .add_player_filters(&params)
        .add_order_by(params.sort(), goals_calculation)
        .add_limit_and_offset(params.limit(), params.page());

    query
}

fn build_query_from_events<'a>(params: ProcessedSearchParams) -> QueryBuilder<Postgres> {
    let goals_calculation = get_goals_calculation(params.penalties(), true);

    let mut query = QueryBuilder::new("");

    query.construct_appearances_table_using_minute_filters(&params)
        .push("
    SELECT ").add_rank(params.sort(), &goals_calculation)
        .push("a.player_id, player_name, country_of_citizenship, sub_position, image_url, club_id,
        c.competition_id, c.name AS competition_name, c.country_name AS competition_country, date, season, home_club_id, home_club_name,
        home_club_goals, away_club_id, away_club_name, away_club_goals, minutes_played, ")
        .push(goals_calculation).push(" AS goals, assists
        FROM
            games_minute_appearance_filter a
        JOIN
            games ON a.game_id = games.game_id
        JOIN
            competitions c ON c.competition_id = games.competition_id")
        .add_order_by(params.sort(), &goals_calculation)
        .add_limit_and_offset(params.limit(), params.page());

    query
}