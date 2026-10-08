use crate::services::base_query_builder::BaseQueryMethods;
use crate::services::errors::db_list_result;
use crate::services::player::models::{ProcessedSearchParams, SearchParams, SortOption, StatScope};
use crate::services::player::player_query_builder::{
    PlayerFilterMethods, PlayerMinuteFilterMethods, TotalsKind, get_goals_calculation,
};
use crate::services::player::sql_models::PlayerSearchResult;
use actix_web::{HttpResponse, get, web};
use sqlx::{PgPool, Postgres, QueryBuilder};

/// Whether aggregates read the precomputed table or the minute-filtered CTE.
/// The CTE already folds double-yellow reds into `red_cards`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AppearancesSource {
    Direct,
    FromEvents,
}

impl AppearancesSource {
    fn red_cards_sum(&self) -> &'static str {
        match self {
            AppearancesSource::FromEvents => "SUM(a.red_cards)",
            AppearancesSource::Direct => {
                "SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END)"
            }
        }
    }
}

#[get("/search")]
pub async fn search_by_season_or_across_seasons(
    pool: web::Data<PgPool>,
    params: web::Query<SearchParams>,
) -> HttpResponse {
    let search_params = params.to_processed();
    let mut query = construct_query_from_params(search_params);
    db_list_result(
        query
            .build_query_as::<PlayerSearchResult>()
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
    let goals_calculation = get_goals_calculation(params.penalties(), TotalsKind::PerSeason);
    let season_scoped = *params.scope() == StatScope::Season;

    let mut query = QueryBuilder::new(
        "
    SELECT ",
    );

    query
        .add_rank(params.sort(), goals_calculation, AppearancesSource::Direct)
        .push(
            "
        a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position,
        COUNT(*) AS total_appearances,
        SUM(CASE WHEN a.played_from_minute > 0 THEN 1 ELSE 0 END) AS substitute_appearances,
        ",
        )
        .push(goals_calculation)
        .push(
            " AS total_goals,
        SUM(a.assists) AS total_assists,
        SUM(a.yellow_cards) AS total_yellow_cards,
        SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END) AS total_red_cards,
        SUM(a.minutes_played) AS total_minutes_played,
        STRING_AGG(DISTINCT c.club_id::TEXT, ', ') AS clubs_played_for,",
        )
        .push(if season_scoped {
            "
        g.season AS season,"
        } else {
            ""
        })
        .add_minutes_per_event_calculations(goals_calculation, AppearancesSource::Direct)
        .push(
            "
        FROM
            appearances_enhanced a
        JOIN
            clubs c ON c.club_id = a.player_club_id
        JOIN
            players p ON p.player_id = a.player_id
        JOIN
            games g ON g.game_id = a.game_id
        WHERE 1 = 1",
        )
        .add_player_filters(&params)
        .add_group_by(season_scoped)
        .add_minimum_appearances_to_query(params.minimum_appearances())
        .add_order_by(
            params.sort(),
            goals_calculation,
            AppearancesSource::Direct,
            season_scoped,
        )
        .add_limit_and_offset(params.limit(), params.page());

    query
}

fn build_query_from_events(params: ProcessedSearchParams) -> QueryBuilder<Postgres> {
    let goals_calculation = get_goals_calculation(params.penalties(), TotalsKind::PerSeason);
    let season_scoped = *params.scope() == StatScope::Season;
    let mut query = QueryBuilder::new("");

    query
        .construct_appearances_table_using_minute_filters(&params)
        .push(
            "
    SELECT ",
        )
        .add_rank(
            params.sort(),
            goals_calculation,
            AppearancesSource::FromEvents,
        )
        .push(
            "player_id, player_name, image_url, country_of_citizenship, sub_position,
        COUNT(*) AS total_appearances,
        SUM(substitute_appearances) AS substitute_appearances,
	    ",
        )
        .push(goals_calculation)
        .push(
            " AS total_goals,
	    SUM(assists) AS total_assists,
        SUM(yellow_cards) AS total_yellow_cards,
        SUM(red_cards) AS total_red_cards,
        SUM(minutes_played) AS total_minutes_played,
        STRING_AGG(DISTINCT a.club_id::TEXT, ', ') AS clubs_played_for,",
        )
        .push(if season_scoped {
            "a.season AS season,"
        } else {
            ""
        })
        .add_minutes_per_event_calculations(goals_calculation, AppearancesSource::FromEvents)
        .push(
            "
        FROM
            games_minute_appearance_filter a
            WHERE appearances > 0",
        )
        .add_group_by(season_scoped)
        .add_minimum_appearances_to_query(params.minimum_appearances())
        .add_order_by(
            params.sort(),
            goals_calculation,
            AppearancesSource::FromEvents,
            season_scoped,
        )
        .add_limit_and_offset(params.limit(), params.page());

    query
}

trait SeasonOrSeasonsQueryMethods {
    fn add_rank(
        &mut self,
        sort_by: &SortOption,
        goals_calculation: &str,
        source: AppearancesSource,
    ) -> &mut Self;
    fn add_order_by(
        &mut self,
        sort_by: &SortOption,
        goals_calculation: &str,
        source: AppearancesSource,
        season_scope: bool,
    ) -> &mut Self;
    fn add_minutes_per_event_calculations(
        &mut self,
        goals_calculation: &str,
        source: AppearancesSource,
    ) -> &mut Self;
    fn add_minimum_appearances_to_query(&mut self, minimum_appearances: i32) -> &mut Self;
    fn add_group_by(&mut self, season_scope: bool) -> &mut Self;
}

impl SeasonOrSeasonsQueryMethods for QueryBuilder<Postgres> {
    fn add_rank(
        &mut self,
        sort_by: &SortOption,
        goals_calculation: &str,
        source: AppearancesSource,
    ) -> &mut Self {
        self.push("RANK() OVER (ORDER BY ");
        let red_sum = source.red_cards_sum();
        let rank_order = match sort_by {
            SortOption::Goals => format!("{goals_calculation} DESC"),
            SortOption::Assists => "SUM(a.assists) DESC".to_string(),
            SortOption::GoalsAndAssists => {
                format!("SUM(a.assists) + {goals_calculation} DESC")
            }
            SortOption::Appearances => "COUNT(*) DESC".to_string(),
            SortOption::MinutesPlayed => "SUM(a.minutes_played) DESC".to_string(),
            SortOption::YellowCards => "SUM(a.yellow_cards) DESC".to_string(),
            SortOption::RedCards => format!("{red_sum} DESC"),
            SortOption::MinutesPerGoal => {
                format!("SUM(a.minutes_played) / NULLIF({goals_calculation}, 0)")
            }
            SortOption::MinutesPerAssist => {
                "SUM(a.minutes_played) / NULLIF(SUM(a.assists), 0)".to_string()
            }
            SortOption::MinutesPerGoalOrAssist => {
                format!("SUM(a.minutes_played) / NULLIF({goals_calculation} + SUM(a.assists), 0)")
            }
            SortOption::MinutesPerYellow => {
                "SUM(a.minutes_played) / NULLIF(SUM(a.yellow_cards), 0)".to_string()
            }
            SortOption::MinutesPerRed => {
                format!("SUM(a.minutes_played) / NULLIF(({red_sum}), 0)")
            }
            _ => format!("{goals_calculation} DESC"),
        };

        self.push(rank_order).push("), ");

        self
    }

    fn add_order_by(
        &mut self,
        sort_by: &SortOption,
        goals_calculation: &str,
        source: AppearancesSource,
        season_scope: bool,
    ) -> &mut Self {
        self.push(
            "
        ORDER BY ",
        );

        let red_sum = source.red_cards_sum();
        let sort_clause = match sort_by {
            SortOption::Goals => format!(
                "{goals_calculation} DESC, SUM(a.assists) DESC, SUM(a.minutes_played) ASC, SUM(a.red_cards) ASC, SUM(a.yellow_cards) ASC, a.player_name"
            ),
            SortOption::Assists => format!(
                "SUM(a.assists) DESC, {goals_calculation} DESC, a.player_name"
            ),
            SortOption::GoalsAndAssists => format!(
                "SUM(a.assists) + {goals_calculation} DESC, a.player_name"
            ),
            SortOption::Appearances => {
                "COUNT(*) DESC, SUM(a.minutes_played) DESC, a.player_name".to_string()
            }
            SortOption::MinutesPlayed => {
                "SUM(a.minutes_played) DESC, COUNT(*) DESC, a.player_name".to_string()
            }
            SortOption::YellowCards => {
                "SUM(a.yellow_cards) DESC, SUM(a.red_cards) DESC, a.player_name".to_string()
            }
            SortOption::RedCards => {
                format!("{red_sum} DESC, SUM(a.yellow_cards) DESC, a.player_name")
            }
            SortOption::MinutesPerGoal => format!(
                "SUM(a.minutes_played) / NULLIF({goals_calculation}, 0), {goals_calculation} DESC, a.player_name"
            ),
            SortOption::MinutesPerAssist => "SUM(a.minutes_played) / NULLIF(SUM(a.assists), 0), SUM(a.assists) DESC, a.player_name".to_string(),
            SortOption::MinutesPerGoalOrAssist => format!(
                "SUM(a.minutes_played) / NULLIF({goals_calculation} + SUM(a.assists), 0), a.player_name"
            ),
            SortOption::MinutesPerYellow => "SUM(a.minutes_played) / NULLIF(SUM(a.yellow_cards), 0), SUM(a.yellow_cards) DESC, a.player_name".to_string(),
            SortOption::MinutesPerRed => {
                format!(
                    "SUM(a.minutes_played) / NULLIF(({red_sum}), 0), {red_sum} DESC, a.player_name"
                )
            }
            _ => format!(
                "{goals_calculation} DESC, SUM(a.assists) DESC, SUM(a.minutes_played) ASC, SUM(a.red_cards) ASC, SUM(a.yellow_cards) ASC, a.player_name"
            ),
        };

        self.push(sort_clause);

        if season_scope {
            self.push(", season");
        }

        self
    }

    fn add_minutes_per_event_calculations(
        &mut self,
        goals_calculation: &str,
        source: AppearancesSource,
    ) -> &mut Self {
        self.push(
            "
        SUM(a.minutes_played) / NULLIF(",
        )
        .push(goals_calculation)
        .push(
            ", 0) AS mins_per_goal,
        SUM(a.minutes_played) / NULLIF(SUM(a.assists), 0) AS mins_per_assist,
        SUM(a.minutes_played) / NULLIF(",
        )
        .push(goals_calculation)
        .push(
            " + SUM(a.assists), 0) AS mins_per_goal_or_assist,
        SUM(a.minutes_played) / NULLIF(SUM(a.yellow_cards), 0) AS mins_per_yellow,
        ",
        );

        // The events CTE already folds double-yellows into red_cards;
        // the direct table needs the extra CASE.
        self.push("SUM(a.minutes_played) / NULLIF((");
        self.push(source.red_cards_sum());
        self.push("), 0) AS mins_per_red");

        self
    }

    fn add_minimum_appearances_to_query(&mut self, minimum_appearances: i32) -> &mut Self {
        if minimum_appearances <= 1 {
            return self;
        }

        self.push(
            "
        HAVING COUNT(*) >= ",
        )
        .push_bind(minimum_appearances);

        self
    }

    fn add_group_by(&mut self, season_scope: bool) -> &mut Self {
        self.push(
            "
        GROUP BY a.player_id, a.player_name, image_url, country_of_citizenship, sub_position",
        )
        .push(if season_scope { ", season" } else { "" });

        self
    }
}
