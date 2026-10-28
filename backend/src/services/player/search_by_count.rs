use crate::services::base_query_builder::BaseQueryMethods;
use crate::services::errors::db_list_result;
use crate::services::player::models::SortOption::NumberOfSeasonsWith;
use crate::services::player::models::{ProcessedSearchParams, SearchParams, StatScope};
use crate::services::player::player_query_builder::{
    PlayerFilterMethods, PlayerMinuteFilterMethods, TotalsKind, get_goals_calculation,
};
use crate::services::player::sql_models::PlayerNumberOfGamesOrSeasonsResult;
use actix_web::{HttpResponse, get, web};
use sqlx::{PgPool, Postgres, QueryBuilder};

#[get("/search/occurrences")]
pub async fn search_by_count(
    pool: web::Data<PgPool>,
    params: web::Query<SearchParams>,
) -> HttpResponse {
    let games_or_seasons_search_params = params.to_processed();
    let mut query =
        construct_number_of_games_or_seasons_query_from_params(games_or_seasons_search_params);
    db_list_result(
        query
            .build_query_as::<PlayerNumberOfGamesOrSeasonsResult>()
            .fetch_all(pool.get_ref())
            .await,
    )
}

fn construct_number_of_games_or_seasons_query_from_params(
    params: ProcessedSearchParams,
) -> QueryBuilder<Postgres> {
    match (params.has_minute_filter(), &params.sort) {
        (false, NumberOfSeasonsWith) => build_number_of_seasons_query_from_appearances(params),
        (false, _) => build_number_of_games_query_from_appearances(params),
        (true, NumberOfSeasonsWith) => build_number_of_seasons_query_from_events(params),
        (true, _) => build_number_of_games_query_from_events(params),
    }
}

fn build_number_of_seasons_query_from_events(
    params: ProcessedSearchParams,
) -> QueryBuilder<Postgres> {
    let goals_calculation = get_goals_calculation(&params.penalty, TotalsKind::PerSeason);

    let mut query = QueryBuilder::new("");

    query.construct_appearances_table_using_minute_filters(&params).push(",

        player_season_goals AS (
        SELECT a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, ARRAY_AGG(DISTINCT c.club_id) AS unique_clubs_played_for,
        g.season, ").push(goals_calculation).push(" AS total_goals, SUM(a.assists) AS total_assists,
        SUM(a.yellow_cards) AS total_yellow_cards,
        SUM(a.red_cards) AS total_red_cards
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
            ARRAY_AGG(DISTINCT ps.season ORDER BY ps.season) AS qualifying_seasons,
        COUNT(DISTINCT ps.season) AS number_of_seasons
        FROM
            player_season_goals ps,
            LATERAL UNNEST(ps.unique_clubs_played_for) AS club_id
        WHERE
            1 = 1")
        .add_season_filters(&params).push("
        GROUP BY ps.player_id, ps.player_name, ps.image_url, ps.country_of_citizenship, ps.sub_position
        ORDER BY number_of_seasons DESC, ps.player_name")
        .add_limit_and_offset(params.pagination.limit, params.pagination.page);

    query
}

fn build_number_of_games_query_from_appearances(
    params: ProcessedSearchParams,
) -> QueryBuilder<Postgres> {
    let goals_calculation = get_goals_calculation(&params.penalty, TotalsKind::PerGame);
    let mut query = QueryBuilder::new("");

    query
        .push(
            "SELECT
        RANK() OVER (ORDER BY COUNT(DISTINCT a.game_id) DESC) AS rank,
        a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position,
        STRING_AGG(DISTINCT c.club_id::TEXT, ', ') AS clubs_played_for,
        ARRAY_AGG(DISTINCT a.game_id ORDER BY a.game_id) AS qualifying_game_ids,
        COUNT(DISTINCT a.game_id) AS number_of_games",
        )
        .push(if params.scope == StatScope::Season {
            ", g.season"
        } else {
            ""
        })
        .push(
            "
        FROM
            appearances_enhanced a
        JOIN
            clubs c ON c.club_id = a.player_club_id
        JOIN
            players p on p.player_id = a.player_id
        JOIN
            games g ON g.game_id = a.game_id
        WHERE 1 = 1",
        )
        .add_game_filters(goals_calculation, &params)
        .add_player_filters(&params)
        .push(
            "
        GROUP BY a.player_id, player_name, image_url, country_of_citizenship, sub_position",
        )
        .push(if params.scope == StatScope::Season {
            ", g.season"
        } else {
            ""
        })
        .push(
            "
        ORDER BY number_of_games DESC, player_name",
        )
        .add_limit_and_offset(params.pagination.limit, params.pagination.page);

    query
}

fn build_number_of_games_query_from_events(
    params: ProcessedSearchParams,
) -> QueryBuilder<Postgres> {
    let goals_calculation = get_goals_calculation(&params.penalty, TotalsKind::PerGame);

    let mut query = QueryBuilder::new("");

    query.construct_appearances_table_using_minute_filters(&params).push("
        SELECT RANK() OVER (ORDER BY COUNT(DISTINCT a.game_id) DESC) AS rank,
            a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position,
            STRING_AGG(DISTINCT c.club_id::TEXT, ', ') AS clubs_played_for,
            ARRAY_AGG(DISTINCT a.game_id ORDER BY a.game_id) AS qualifying_game_ids,
        COUNT(DISTINCT a.game_id) AS number_of_games")
        .push(if params.scope == StatScope::Season {", g.season"} else {""}).push("
            FROM
                games_minute_appearance_filter a
            JOIN
                clubs c ON c.club_id = a.club_id
            JOIN
                players p on p.player_id = a.player_id
            JOIN
                games g ON g.game_id = a.game_id
            WHERE a.appearances > 0")
        .add_game_filters(goals_calculation, &params).push("
            GROUP BY a.player_id, player_name, p.image_url, p.country_of_citizenship, p.sub_position")
        .push(if params.scope == StatScope::Season {", g.season"} else {""}).push("
        ORDER BY number_of_games DESC, player_name")
        .add_limit_and_offset(params.pagination.limit, params.pagination.page);

    query
}

fn build_number_of_seasons_query_from_appearances(
    params: ProcessedSearchParams,
) -> QueryBuilder<Postgres> {
    let goals_calculation = get_goals_calculation(&params.penalty, TotalsKind::PerSeason);

    let mut query = QueryBuilder::new("");

    query.push("
    WITH player_season_goals AS (
        SELECT a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, ARRAY_AGG(DISTINCT c.club_id) AS unique_clubs_played_for,
        g.season, ");
    query.push(goals_calculation).push(" AS total_goals, SUM(a.assists) AS total_assists,
        SUM(a.yellow_cards) AS total_yellow_cards,
        SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END) AS total_red_cards
        FROM
            appearances_enhanced a
        JOIN
            clubs c ON c.club_id = a.player_club_id
        JOIN
            players p on p.player_id = a.player_id
        JOIN
            games g ON g.game_id = a.game_id
        WHERE 1 = 1")
        .add_player_filters(&params).push("
            GROUP BY a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, g.season
    )

    SELECT
        RANK() OVER (ORDER BY COUNT(DISTINCT ps.season) DESC) AS rank,
        ps.player_id, ps.player_name, ps.image_url, ps.country_of_citizenship, ps.sub_position,
        STRING_AGG(DISTINCT club_id::TEXT, ', ') AS clubs_played_for,
        ARRAY_AGG(DISTINCT ps.season ORDER BY ps.season) AS qualifying_seasons,
        COUNT(DISTINCT ps.season) AS number_of_seasons
        FROM
            player_season_goals ps,
            LATERAL UNNEST(ps.unique_clubs_played_for) AS club_id
        WHERE 1 = 1")
        .add_season_filters(&params).push("
        GROUP BY ps.player_id, ps.player_name, ps.image_url, ps.country_of_citizenship, ps.sub_position
        ORDER BY number_of_seasons DESC, ps.player_name")
        .add_limit_and_offset(params.pagination.limit, params.pagination.page);

    query
}

enum StatBound {
    Minimum,
    Maximum,
}

trait OccurrenceFilters {
    /// Expressions are internal SQL fragments; threshold values are always bound.
    fn add_stat_bound(&mut self, expression: &str, bound: StatBound, value: i32) -> &mut Self;
    fn add_season_filters(&mut self, params: &ProcessedSearchParams) -> &mut Self;
    fn add_minimum_season_goals(&mut self, minimum_season_goals: i32) -> &mut Self;
    fn add_maximum_season_goals(&mut self, maximum_season_goals: i32) -> &mut Self;
    fn add_minimum_season_assists(&mut self, minimum_season_assists: i32) -> &mut Self;
    fn add_maximum_season_assists(&mut self, maximum_season_assists: i32) -> &mut Self;
    fn add_minimum_season_goals_and_assists(
        &mut self,
        minimum_season_goals_and_assists: i32,
    ) -> &mut Self;
    fn add_maximum_season_goals_and_assists(
        &mut self,
        maximum_season_goals_and_assists: i32,
    ) -> &mut Self;
    fn add_minimum_season_yellow_cards(&mut self, minimum: i32) -> &mut Self;
    fn add_maximum_season_yellow_cards(&mut self, maximum: i32) -> &mut Self;
    fn add_minimum_season_red_cards(&mut self, minimum: i32) -> &mut Self;
    fn add_maximum_season_red_cards(&mut self, maximum: i32) -> &mut Self;
    fn add_game_filters(
        &mut self,
        goals_calculation: &str,
        params: &ProcessedSearchParams,
    ) -> &mut Self;
    fn add_minimum_game_goals(&mut self, goals_calculation: &str, minimum_goals: i32) -> &mut Self;
    fn add_maximum_game_goals(&mut self, goals_calculation: &str, maximum_goals: i32) -> &mut Self;
    fn add_minimum_game_assists(&mut self, minimum_assists: i32) -> &mut Self;
    fn add_maximum_game_assists(&mut self, maximum_assists: i32) -> &mut Self;
    fn add_minimum_game_goals_and_assists(
        &mut self,
        goals_calculation: &str,
        minimum_game_goals_and_assists: i32,
    ) -> &mut Self;
    fn add_maximum_game_goals_and_assists(
        &mut self,
        goals_calculation: &str,
        maximum_game_goals_and_assists: i32,
    ) -> &mut Self;
}

impl OccurrenceFilters for QueryBuilder<Postgres> {
    fn add_stat_bound(&mut self, expression: &str, bound: StatBound, value: i32) -> &mut Self {
        if value < 0 {
            return self;
        }
        let operator = match bound {
            StatBound::Minimum => " >= ",
            StatBound::Maximum => " <= ",
        };
        self.push(" AND ")
            .push(expression)
            .push(operator)
            .push_bind(value);
        self
    }

    fn add_season_filters(&mut self, params: &ProcessedSearchParams) -> &mut Self {
        self.add_minimum_season_goals(params.thresholds.min_goals)
            .add_maximum_season_goals(params.thresholds.max_goals)
            .add_minimum_season_assists(params.thresholds.min_assists)
            .add_maximum_season_assists(params.thresholds.max_assists)
            .add_minimum_season_goals_and_assists(params.thresholds.min_goals_and_assists)
            .add_maximum_season_goals_and_assists(params.thresholds.max_goals_and_assists)
            .add_minimum_season_yellow_cards(params.thresholds.min_yellow_cards)
            .add_maximum_season_yellow_cards(params.thresholds.max_yellow_cards)
            .add_minimum_season_red_cards(params.thresholds.min_red_cards)
            .add_maximum_season_red_cards(params.thresholds.max_red_cards)
    }

    fn add_minimum_season_yellow_cards(&mut self, minimum: i32) -> &mut Self {
        self.add_stat_bound("total_yellow_cards", StatBound::Minimum, minimum)
    }

    fn add_maximum_season_yellow_cards(&mut self, maximum: i32) -> &mut Self {
        self.add_stat_bound("total_yellow_cards", StatBound::Maximum, maximum)
    }

    fn add_minimum_season_red_cards(&mut self, minimum: i32) -> &mut Self {
        self.add_stat_bound("total_red_cards", StatBound::Minimum, minimum)
    }

    fn add_maximum_season_red_cards(&mut self, maximum: i32) -> &mut Self {
        self.add_stat_bound("total_red_cards", StatBound::Maximum, maximum)
    }

    fn add_minimum_season_goals(&mut self, minimum_goals: i32) -> &mut Self {
        self.add_stat_bound("total_goals", StatBound::Minimum, minimum_goals)
    }

    fn add_maximum_season_goals(&mut self, maximum_goals: i32) -> &mut Self {
        self.add_stat_bound("total_goals", StatBound::Maximum, maximum_goals)
    }

    fn add_minimum_season_assists(&mut self, minimum_assists: i32) -> &mut Self {
        self.add_stat_bound("total_assists", StatBound::Minimum, minimum_assists)
    }

    fn add_maximum_season_assists(&mut self, maximum_assists: i32) -> &mut Self {
        self.add_stat_bound("total_assists", StatBound::Maximum, maximum_assists)
    }

    fn add_minimum_season_goals_and_assists(
        &mut self,
        minimum_goals_and_assists: i32,
    ) -> &mut Self {
        self.add_stat_bound(
            "total_goals + total_assists",
            StatBound::Minimum,
            minimum_goals_and_assists,
        )
    }

    fn add_maximum_season_goals_and_assists(
        &mut self,
        maximum_goals_and_assists: i32,
    ) -> &mut Self {
        self.add_stat_bound(
            "total_goals + total_assists",
            StatBound::Maximum,
            maximum_goals_and_assists,
        )
    }

    fn add_game_filters(
        &mut self,
        goals_calculation: &str,
        params: &ProcessedSearchParams,
    ) -> &mut Self {
        self.add_minimum_game_goals(goals_calculation, params.thresholds.min_goals)
            .add_maximum_game_goals(goals_calculation, params.thresholds.max_goals)
            .add_minimum_game_assists(params.thresholds.min_assists)
            .add_maximum_game_assists(params.thresholds.max_assists)
            .add_minimum_game_goals_and_assists(
                goals_calculation,
                params.thresholds.min_goals_and_assists,
            )
            .add_maximum_game_goals_and_assists(
                goals_calculation,
                params.thresholds.max_goals_and_assists,
            )
    }

    fn add_minimum_game_goals(&mut self, goals_calculation: &str, minimum_goals: i32) -> &mut Self {
        self.add_stat_bound(goals_calculation, StatBound::Minimum, minimum_goals)
    }

    fn add_maximum_game_goals(&mut self, goals_calculation: &str, maximum_goals: i32) -> &mut Self {
        self.add_stat_bound(goals_calculation, StatBound::Maximum, maximum_goals)
    }

    fn add_minimum_game_assists(&mut self, minimum_assists: i32) -> &mut Self {
        self.add_stat_bound("assists", StatBound::Minimum, minimum_assists)
    }

    fn add_maximum_game_assists(&mut self, maximum_assists: i32) -> &mut Self {
        self.add_stat_bound("assists", StatBound::Maximum, maximum_assists)
    }

    fn add_minimum_game_goals_and_assists(
        &mut self,
        goals_calculation: &str,
        minimum_goals_and_assists: i32,
    ) -> &mut Self {
        self.add_stat_bound(
            &format!("{goals_calculation} + assists"),
            StatBound::Minimum,
            minimum_goals_and_assists,
        )
    }

    fn add_maximum_game_goals_and_assists(
        &mut self,
        goals_calculation: &str,
        maximum_goals_and_assists: i32,
    ) -> &mut Self {
        self.add_stat_bound(
            &format!("{goals_calculation} + assists"),
            StatBound::Maximum,
            maximum_goals_and_assists,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maximum_bounds_apply_in_all_count_query_paths() {
        for sort in ["gw", "sw"] {
            for minute_filter in ["", "&minfrom=46"] {
                for penalty in ["ip", "ep", "op"] {
                    for (key, game_column, season_column) in [
                        (
                            "maxg",
                            get_goals_calculation(
                                &crate::services::player::models::PenaltyOption::from_code(penalty),
                                TotalsKind::PerGame,
                            )
                            .to_string(),
                            "total_goals",
                        ),
                        ("maxa", "assists".to_string(), "total_assists"),
                        (
                            "maxga",
                            format!(
                                "{} + assists",
                                get_goals_calculation(
                                    &crate::services::player::models::PenaltyOption::from_code(
                                        penalty
                                    ),
                                    TotalsKind::PerGame
                                )
                            ),
                            "total_goals + total_assists",
                        ),
                    ] {
                        for bound in [None, Some(-1), Some(0), Some(3)] {
                            let mut query_string =
                                format!("sort={sort}&penalty={penalty}{minute_filter}");
                            if let Some(value) = bound {
                                query_string.push_str(&format!("&{key}={value}"));
                            }
                            let params: SearchParams =
                                serde_urlencoded::from_str(&query_string).unwrap();
                            let query = construct_number_of_games_or_seasons_query_from_params(
                                params.to_processed(),
                            );
                            let column = if sort == "sw" {
                                season_column
                            } else {
                                &game_column
                            };
                            assert_eq!(
                                query.sql().as_str().contains(&format!("{column} <= $")),
                                bound.is_some_and(|value| value >= 0),
                                "{query_string}: {}",
                                query.sql().as_str(),
                            );
                        }
                    }
                }
            }
        }
    }
    #[test]
    fn card_bounds_only_apply_to_season_counts_and_preserve_zero() {
        for sort in ["sw", "gw"] {
            for minute in ["", "&minfrom=46"] {
                for (key, column, operator) in [
                    ("miny", "total_yellow_cards", ">="),
                    ("maxy", "total_yellow_cards", "<="),
                    ("minr", "total_red_cards", ">="),
                    ("maxr", "total_red_cards", "<="),
                ] {
                    for bound in [-1, 0, 2] {
                        let params: SearchParams = serde_urlencoded::from_str(&format!(
                            "sort={sort}{minute}&{key}={bound}"
                        ))
                        .unwrap();
                        let query = construct_number_of_games_or_seasons_query_from_params(
                            params.to_processed(),
                        );
                        assert_eq!(
                            query
                                .sql()
                                .as_str()
                                .contains(&format!("AND {column} {operator} $")),
                            sort == "sw" && bound >= 0
                        );
                    }
                }
            }
        }
    }
}
