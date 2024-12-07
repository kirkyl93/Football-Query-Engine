use actix_web::{get, web, HttpResponse};
use sqlx::{PgPool, Postgres, QueryBuilder};
use crate::services::player::models::{ProcessedSearchParams, SearchParams, SortOption, StatScope};
use crate::services::player::shared_sql_helper::{add_ages_to_query, add_clubs_played_against_to_query, add_clubs_played_for_to_query, add_competitions_to_query, add_height_to_query, add_home_away_to_query, add_limit_and_offset_to_query, add_player_countries_to_query, add_player_names_to_query, add_positions_to_query, add_seasons_to_query, add_sub_info_to_query, construct_appearances_table_from_game_events, goals_query_string};
use crate::services::player::sql_models::PlayerSearchResult;

#[get("/search")]
pub async fn search_by_season_or_across_seasons(pool: web::Data<PgPool>, params: web::Query<SearchParams>) -> HttpResponse {
    match params.to_processed() {
        Ok(search_params) => {
            let mut query = construct_query_from_params(search_params);
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

fn construct_query_from_params<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    if params.minute_played_from() == 0 && params.minute_played_to() == 120 {
        return build_query_from_appearances(params);
    }

    return build_query_from_events(params);
}

fn build_query_from_appearances<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let goals_calculation = goals_query_string(params.penalties(), false);

    let mut query = QueryBuilder::new("SELECT ");

    add_rank_to_query(&mut query, params.sort(), &goals_calculation, false);

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
    if *params.scope() == StatScope::Season {
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

    add_group_by_to_query(&mut query, *params.scope() == StatScope::Season);
    add_minimum_appearances_to_query(&mut query, params.minimum_appearances());
    add_order_by_to_query(&mut query, params.sort(), goals_calculation, false, *params.scope() == StatScope::Season);
    add_limit_and_offset_to_query(&mut query, params.limit(), params.page());

    return query;
}

fn build_query_from_events<'a>(params: ProcessedSearchParams) -> QueryBuilder<'a, Postgres> {
    let mut query = QueryBuilder::new("");

    construct_appearances_table_from_game_events(&mut query, &params);

    let goals_calculation = goals_query_string(params.penalties(), false);

    query.push("
    SELECT ");

    add_rank_to_query(&mut query, params.sort(), &goals_calculation, true);

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
    if *params.scope() == StatScope::Season {
        query.push("
    a.season AS season,");
    }

    add_minutes_per_event_calculations(&mut query, &goals_calculation, true);

    query.push("
    FROM
        games_minute_appearance_filter a
        WHERE appearances > 0");

    add_group_by_to_query(&mut query, *params.scope() == StatScope::Season);
    add_minimum_appearances_to_query(&mut query, params.minimum_appearances());
    add_order_by_to_query(&mut query, params.sort(), goals_calculation, true, *params.scope() == StatScope::Season);
    add_limit_and_offset_to_query(&mut query, params.limit(), params.page());

    return query;
}

pub fn add_minutes_per_event_calculations(query: &mut QueryBuilder<Postgres>, goals_calculation: &String, from_events_table: bool) {
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

pub fn add_rank_to_query(query: &mut QueryBuilder<Postgres>, sort_by: &SortOption, goals_calculation: &String, from_events_table: bool) {
    query.push("RANK() OVER (ORDER BY ");
    let rank_order = match sort_by {
        SortOption::Goals => format!("{} DESC", goals_calculation),
        SortOption::Assists => "SUM(a.assists) DESC".into(),
        SortOption::GoalsAndAssists => format!(
            "SUM(a.assists) + {} DESC",
            goals_calculation
        ),
        SortOption::Appearances => "COUNT(*) DESC".into(),
        SortOption::MinutesPlayed => "SUM(a.minutes_played) DESC".into(),
        SortOption::YellowCards => "SUM(a.yellow_cards) DESC".into(),
        SortOption::RedCards => if from_events_table {
            "SUM(a.red_cards) DESC".into()
        } else {
            "SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END) DESC".into()
        },
        SortOption::MinutesPerGoal => format!(
            "SUM(a.minutes_played) / NULLIF({}, 0)",
            goals_calculation
        ),
        SortOption::MinutesPerAssist => "SUM(a.minutes_played) / NULLIF(SUM(a.assists), 0)".into(),
        SortOption::MinutesPerGoalOrAssist => format!(
            "SUM(a.minutes_played) / NULLIF({} + SUM(a.assists), 0)",
            goals_calculation
        ),
        SortOption::MinutesPerYellow => "SUM(a.minutes_played) / NULLIF(SUM(a.yellow_cards), 0)".into()
        ,
        SortOption::MinutesPerRed => if from_events_table {
            "SUM(a.minutes_played) / NULLIF(SUM(a.red_cards), 0)".into()
        } else {
            "SUM(a.minutes_played) / NULLIF((SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END)), 0)".into()
        },
        _ => format!("{} DESC", goals_calculation)
    };

    query.push(rank_order).push("), ");
}

pub fn add_group_by_to_query(query: &mut QueryBuilder<Postgres>, season_scope: bool) {
    query.push("
    GROUP BY a.player_id, a.player_name, image_url, country_of_citizenship, sub_position");

    if season_scope {
        query.push(", season");
    }
}

pub fn add_minimum_appearances_to_query(query: &mut QueryBuilder<Postgres>, minimum_appearances: i32) {
    if minimum_appearances > 1 {
        query.push("
    HAVING COUNT(*) >= ").push_bind(minimum_appearances);
    }
}

pub fn add_order_by_to_query(query: &mut QueryBuilder<Postgres>, sort_by: &SortOption, goals_calculation: String, from_events_table: bool, season_scope: bool) {
    query.push("
    ORDER BY ");

    let sort_clause = match sort_by {
        SortOption::Goals => format!(
            "{} DESC, SUM(a.assists) DESC, SUM(a.minutes_played) ASC, SUM(a.red_cards) ASC, SUM(a.yellow_cards) ASC, a.player_name",
            goals_calculation
        ),
        SortOption::Assists => format!(
            "SUM(a.assists) DESC, {} DESC, a.player_name",
            goals_calculation
        ),
        SortOption::GoalsAndAssists => format!(
            "SUM(a.assists) + {} DESC, a.player_name",
            goals_calculation
        ),
        SortOption::Appearances => "COUNT(*) DESC, SUM(a.minutes_played) DESC, a.player_name".into(),
        SortOption::MinutesPlayed => "SUM(a.minutes_played) DESC, COUNT(*) DESC, a.player_name".into(),
        SortOption::YellowCards => "SUM(a.yellow_cards) DESC, SUM(a.red_cards) DESC, a.player_name".into(),
        SortOption::RedCards => format!(
            "{}, SUM(a.yellow_cards) DESC, a.player_name",
            if from_events_table {
                "SUM(a.red_cards) DESC"
            } else {
                "SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END) DESC"
            }),
        SortOption::MinutesPerGoal => format!(
            "SUM(a.minutes_played) / NULLIF({}, 0), {} DESC, a.player_name",
            goals_calculation, goals_calculation
        ),
        SortOption::MinutesPerAssist => "SUM(a.minutes_played) / NULLIF(SUM(a.assists), 0), SUM(a.assists) DESC, a.player_name".into(),
        SortOption::MinutesPerGoalOrAssist => format!(
            "SUM(a.minutes_played) / NULLIF({} + SUM(a.assists), 0), a.player_name",
            goals_calculation
        ),
        SortOption::MinutesPerYellow => "SUM(a.minutes_played) / NULLIF(SUM(a.yellow_cards), 0), SUM(a.yellow_cards) DESC, a.player_name".into(),
        SortOption::MinutesPerRed => if from_events_table {
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

