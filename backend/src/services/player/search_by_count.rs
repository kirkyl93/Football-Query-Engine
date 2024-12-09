use actix_web::{get, web, HttpResponse};
use sqlx::{PgPool, Postgres, QueryBuilder};
use crate::services::base_query_builder::BaseQueryMethods;
use crate::services::player::models::{ProcessedSearchParams, SearchParams, StatScope};
use crate::services::player::models::SortOption::NumberOfSeasonsWith;
use crate::services::player::player_query_builder::{get_goals_calculation, PlayerMinuteFilterMethods, PlayerFilterMethods};
use crate::services::player::sql_models::PlayerNumberOfGamesOrSeasonsResult;

#[get("/search/occurrences")]
pub async fn search_by_count(pool: web::Data<PgPool>, params: web::Query<SearchParams>) -> HttpResponse {
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
    let goals_calculation = get_goals_calculation(params.penalties(), false);

    let mut query = QueryBuilder::new("");

    query.construct_appearances_table_using_minute_filters(&params).push(",

        player_season_goals AS (
        SELECT a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, ARRAY_AGG(DISTINCT c.club_id) AS unique_clubs_played_for,
        g.season, ").push(goals_calculation).push(" AS total_goals, SUM(a.assists) AS total_assists
        FROM
            games_minute_appearance_filter a
        JOIN
            clubs c ON c.club_id = a.club_id
        JOIN
            players p ON p.player_id = a.player_id
        JOIN
            games g ON g.game_id = a.game_id
        WHERE appearances > 0
        GROUP BY a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, g.season)

        SELECT
            RANK() OVER (ORDER BY COUNT(DISTINCT ps.season) DESC) AS rank,
            ps.player_id, ps.player_name, ps.image_url, ps.country_of_citizenship, ps.sub_position,
            STRING_AGG(DISTINCT club_id::TEXT, ', ') AS clubs_played_for,
            COUNT(DISTINCT ps.season) AS number_of_seasons
        FROM
            player_season_goals ps,
            LATERAL UNNEST(ps.unique_clubs_played_for) AS club_id
        WHERE
            1 = 1")
        .add_season_filters(&params).push("
        GROUP BY ps.player_id, ps.player_name, ps.image_url, ps.country_of_citizenship, ps.sub_position
        ORDER BY number_of_seasons DESC, ps.player_name")
        .add_limit_and_offset(params.limit(), params.page());

    query
}

fn build_number_of_games_query_from_appearances<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let goals_calculation = get_goals_calculation(params.penalties(), true);
    let mut query = QueryBuilder::new("");

    query.push("SELECT
        RANK() OVER (ORDER BY COUNT(DISTINCT a.game_id) DESC) AS rank,
        a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position,
        STRING_AGG(DISTINCT c.club_id::TEXT, ', ') AS clubs_played_for,
        COUNT(DISTINCT a.game_id) AS number_of_games")
        .push(if *params.scope() == StatScope::Season {", g.season"} else {""})
        .push("
        FROM
            appearances_enhanced a
        JOIN
            clubs c ON c.club_id = a.player_club_id
        JOIN
            players p on p.player_id = a.player_id
        JOIN
            games g ON g.game_id = a.game_id
        WHERE 1 = 1")
        .add_game_filters(goals_calculation, &params)
        .add_player_filters(&params).push("
        GROUP BY a.player_id, player_name, image_url, country_of_citizenship, sub_position")
        .push(if *params.scope() == StatScope::Season {", g.season"} else {""})
        .push("
        ORDER BY number_of_games DESC, player_name")
        .add_limit_and_offset(params.limit(), params.page());

    query
}

fn build_number_of_games_query_from_events<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let goals_calculation = get_goals_calculation(params.penalties(), true);

    let mut query = QueryBuilder::new("");

    query.construct_appearances_table_using_minute_filters(&params).push("
        SELECT RANK() OVER (ORDER BY COUNT(DISTINCT a.game_id) DESC) AS rank,
            a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position,
            STRING_AGG(DISTINCT c.club_id::TEXT, ', ') AS clubs_played_for,
            COUNT(DISTINCT a.game_id) AS number_of_games")
        .push(if *params.scope() == StatScope::Season {", g.season"} else {""})
        .push("
            FROM
                games_minute_appearance_filter a
            JOIN
                clubs c ON c.club_id = a.club_id
            JOIN
                players p on p.player_id = a.player_id
            JOIN
                games g ON g.game_id = a.game_id
            WHERE 1 = 1")
        .add_game_filters(goals_calculation, &params).push("
            GROUP BY a.player_id, player_name, p.image_url, p.country_of_citizenship, p.sub_position")
        .push(if *params.scope() == StatScope::Season {", g.season"} else {""})
        .push("
        ORDER BY number_of_games DESC, player_name")
        .add_limit_and_offset(params.limit(), params.page());

    query
}

fn build_number_of_seasons_query_from_appearances<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let goals_calculation = get_goals_calculation(params.penalties(), false);

    let mut query = QueryBuilder::new("");

    query.push("
    WITH player_season_goals AS (
        SELECT a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, ARRAY_AGG(DISTINCT c.club_id) AS unique_clubs_played_for,
        g.season, ");query.push(goals_calculation).push(" AS total_goals, SUM(a.assists) AS total_assists
        FROM
            appearances_enhanced a
        JOIN
            clubs c ON c.club_id = a.player_club_id
        JOIN
            players p on p.player_id = a.player_id
        JOIN
            games g ON g.game_id = a.game_id
        WHERE 1 = 1")
        .add_player_filters(&params)
        .push("
            GROUP BY a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, g.season
    )

    SELECT
        RANK() OVER (ORDER BY COUNT(DISTINCT ps.season) DESC) AS rank,
        ps.player_id, ps.player_name, ps.image_url, ps.country_of_citizenship, ps.sub_position,
        STRING_AGG(DISTINCT club_id::TEXT, ', ') AS clubs_played_for,
        COUNT(DISTINCT ps.season) AS number_of_seasons
        FROM
            player_season_goals ps,
            LATERAL UNNEST(ps.unique_clubs_played_for) AS club_id
        WHERE 1 = 1")
        .add_season_filters(&params)
        .push("
        GROUP BY ps.player_id, ps.player_name, ps.image_url, ps.country_of_citizenship, ps.sub_position
        ORDER BY number_of_seasons DESC, ps.player_name")
        .add_limit_and_offset(params.limit(), params.page());

    query
}

trait GoalsAndAssistsFilters<'a> {
    fn add_season_filters(&mut self, params: &ProcessedSearchParams) -> &mut Self;
    fn add_minimum_season_goals(&mut self, minimum_season_goals: i32) -> &mut Self;
    fn add_maximum_season_goals(&mut self, maximum_season_goals: i32) -> &mut Self;
    fn add_minimum_season_assists(&mut self, minimum_season_assists: i32) -> &mut Self;
    fn add_maximum_season_assists(&mut self, maximum_season_assists: i32) -> &mut Self;
    fn add_minimum_season_goals_and_assists(&mut self, minimum_season_goals_and_assists: i32) -> &mut Self;
    fn add_maximum_season_goals_and_assists(&mut self, maximum_season_goals_and_assists: i32) -> &mut Self;
    fn add_game_filters(&mut self, goals_calculation: String, params: &ProcessedSearchParams) -> &mut Self;
    fn add_minimum_game_goals(&mut self, goals_calculation: String, minimum_goals: i32) -> &mut Self;
    fn add_maximum_game_goals(&mut self, goals_calculation: String, maximum_goals: i32) -> &mut Self;
    fn add_minimum_game_assists(&mut self, minimum_assists: i32) -> &mut Self;
    fn add_maximum_game_assists(&mut self, maximum_assists: i32) -> &mut Self;
    fn add_minimum_game_goals_and_assists(&mut self, goals_calculation: String, minimum_game_goals_and_assists: i32) -> &mut Self;
    fn add_maximum_game_goals_and_assists(&mut self, goals_calculation: String, maximum_game_goals_and_assists: i32) -> &mut Self;
}

impl<'a>  GoalsAndAssistsFilters<'a>  for QueryBuilder<'a, Postgres> {
    fn add_season_filters(&mut self, params: &ProcessedSearchParams) -> &mut Self {
        self.add_minimum_season_goals(params.minimum_goals())
            .add_maximum_season_goals(params.maximum_goals())
            .add_minimum_season_assists(params.minimum_assists())
            .add_maximum_season_assists(params.maximum_assists())
            .add_minimum_season_goals_and_assists(params.minimum_goals_and_assists())
            .add_maximum_season_goals_and_assists(params.maximum_goals_and_assists())
    }

    fn add_minimum_season_goals(&mut self, minimum_goals: i32) -> &mut Self {
        if minimum_goals <= 0 {
            return self
        }

        self.push("
        AND total_goals >= ").push_bind(minimum_goals);

        self
    }

    fn add_maximum_season_goals(&mut self, maximum_goals: i32) -> &mut Self {
        if maximum_goals <= 0 {
            return self
        }

        self.push("
        AND total_goals <= ").push_bind(maximum_goals);

        self
    }

    fn add_minimum_season_assists(&mut self, minimum_assists: i32) -> &mut Self {
        if minimum_assists <= 0 {
            return self
        }

        self.push("
        AND total_assists >= ").push_bind(minimum_assists);

        self
    }

    fn add_maximum_season_assists(&mut self, maximum_assists: i32) -> &mut Self {
        if maximum_assists <= 0 {
            return self
        }

        self.push("
        AND total_assists <= ").push_bind(maximum_assists);

        self
    }

    fn add_minimum_season_goals_and_assists(&mut self, minimum_goals_and_assists: i32) -> &mut Self {
        if minimum_goals_and_assists <= 0 {
            return self
        }

        self.push("
        AND total_goals + total_assists >= ").push_bind(minimum_goals_and_assists);

        self
    }

    fn add_maximum_season_goals_and_assists(&mut self, maximum_goals_and_assists: i32) -> &mut Self {
        if maximum_goals_and_assists <= 0 {
            return self
        }

        self.push("
        AND total_goals + total_assists <= ").push_bind(maximum_goals_and_assists);

        self
    }

    fn add_game_filters(&mut self, goals_calculation: String, params: &ProcessedSearchParams) -> &mut Self {
        self.add_minimum_game_goals(goals_calculation.clone(), params.minimum_goals())
            .add_maximum_game_goals(goals_calculation.clone(), params.maximum_goals())
            .add_minimum_game_assists(params.minimum_assists())
            .add_maximum_game_assists(params.maximum_assists())
            .add_minimum_game_goals_and_assists(goals_calculation.clone(), params.minimum_goals_and_assists())
            .add_maximum_game_goals_and_assists(goals_calculation.clone(), params.maximum_goals_and_assists())
    }

    fn add_minimum_game_goals(&mut self, goals_calculation: String, minimum_goals: i32) -> &mut Self {
        if minimum_goals <= 0 {
            return self
        }

        self.push("
        AND ").push(goals_calculation).push(" >= ").push_bind(minimum_goals);

        self
    }

    fn add_maximum_game_goals(&mut self, goals_calculation: String, maximum_goals: i32) -> &mut Self {
        if maximum_goals <= 0 {
            return self
        }

        self.push("
        AND ").push(goals_calculation).push(" <= ").push_bind(maximum_goals);

        self
    }

    fn add_minimum_game_assists(&mut self, minimum_assists: i32) -> &mut Self {
        if minimum_assists <= 0 {
            return self
        }

        self.push("
        AND assists >= ").push_bind(minimum_assists);

        self
    }

    fn add_maximum_game_assists(&mut self, maximum_assists: i32) -> &mut Self {
        if maximum_assists <= 0 {
            return self
        }

        self.push("
        AND assists <= ").push_bind(maximum_assists);

        self
    }

    fn add_minimum_game_goals_and_assists(&mut self, goals_calculation: String, minimum_goals_and_assists: i32) -> &mut Self {
        if minimum_goals_and_assists <= 0 {
            return self
        }

        self.push("
        AND ").push(goals_calculation).push(" + assists >= ").push(minimum_goals_and_assists);

        self
    }

    fn add_maximum_game_goals_and_assists(&mut self, goals_calculation: String, maximum_goals_and_assists: i32) -> &mut Self {
        if maximum_goals_and_assists <= 0 {
            return self
        }

        self.push("
        AND ").push(goals_calculation).push(" + assists <= ").push(maximum_goals_and_assists);

        self
    }
}