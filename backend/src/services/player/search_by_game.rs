use crate::services::base_query_builder::BaseQueryMethods;
use crate::services::errors::db_list_result;
use crate::services::player::models::{ProcessedSearchParams, SearchParams, SortOption};
use crate::services::player::player_query_builder::{
    PlayerFilterMethods, PlayerMinuteFilterMethods, TotalsKind, get_goals_calculation,
};
use crate::services::player::sql_models::PlayerGameSearchResult;
use actix_web::{HttpResponse, get, web};
use sqlx::{PgPool, Postgres, QueryBuilder};

trait GameQueryMethods {
    fn add_rank(&mut self, sort_by: &SortOption, goals_calculation: &str) -> &mut Self;
    fn add_order_by(&mut self, sort_by: &SortOption, goals_calculation: &str) -> &mut Self;
}

impl GameQueryMethods for QueryBuilder<Postgres> {
    fn add_rank(&mut self, sort_by: &SortOption, goals_calculation: &str) -> &mut Self {
        self.push("RANK() OVER (ORDER BY ");
        let rank_order = match sort_by {
            SortOption::Goals => format!("{goals_calculation} DESC"),
            SortOption::Assists => "assists DESC".to_string(),
            SortOption::GoalsAndAssists => {
                format!("assists + {goals_calculation} DESC")
            }
            _ => format!("{goals_calculation} DESC"),
        };
        self.push(rank_order).push("), ");

        self
    }

    fn add_order_by(&mut self, sort_by: &SortOption, goals_calculation: &str) -> &mut Self {
        self.push(
            "
        ORDER BY ",
        );

        let sort_clause = match sort_by {
            SortOption::Goals => format!(
                "{goals_calculation} DESC, assists DESC, minutes_played ASC, red_cards ASC, yellow_cards ASC, player_name, season"
            ),
            SortOption::Assists => {
                format!("assists DESC, {goals_calculation} DESC, a.player_name, season")
            }
            SortOption::GoalsAndAssists => {
                format!("a.assists + {goals_calculation} DESC, a.player_name, season")
            }
            _ => format!(
                "{goals_calculation} DESC, assists DESC, minutes_played ASC, red_cards ASC, yellow_cards ASC, player_name, season"
            ),
        };
        self.push(sort_clause);

        self
    }
}

#[get("/search/game")]
pub async fn search_by_game(
    pool: web::Data<PgPool>,
    params: web::Query<SearchParams>,
) -> HttpResponse {
    let game_search_params = params.to_processed();
    let mut query = construct_query_from_params(game_search_params);
    db_list_result(
        query
            .build_query_as::<PlayerGameSearchResult>()
            .fetch_all(pool.get_ref())
            .await,
    )
}

fn construct_query_from_params(params: ProcessedSearchParams) -> QueryBuilder<Postgres> {
    if params.has_minute_filter() {
        build_query_from_events(params)
    } else {
        build_query_from_appearances(params)
    }
}

fn build_query_from_appearances(params: ProcessedSearchParams) -> QueryBuilder<Postgres> {
    let goals_calculation = get_goals_calculation(&params.penalty, TotalsKind::PerGame);

    let mut query = QueryBuilder::new(
        "
    SELECT ",
    );

    query.add_rank(&params.sort, goals_calculation)
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
        .add_order_by(&params.sort, goals_calculation)
        .add_limit_and_offset(params.pagination.limit, params.pagination.page);

    query
}

fn build_query_from_events(params: ProcessedSearchParams) -> QueryBuilder<Postgres> {
    let goals_calculation = get_goals_calculation(&params.penalty, TotalsKind::PerGame);

    let mut query = QueryBuilder::new("");

    query.construct_appearances_table_using_minute_filters(&params)
        .push(
        "
    SELECT ").add_rank(&params.sort, goals_calculation)
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
        .add_order_by(&params.sort, goals_calculation)
        .add_limit_and_offset(params.pagination.limit, params.pagination.page);

    query
}
