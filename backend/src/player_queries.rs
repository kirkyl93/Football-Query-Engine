use actix_web::{
    get, web::{self, Path}, HttpResponse
};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Postgres, QueryBuilder};

use crate::player::{map_position_code_to_position, Player, PlayerSearchResult, PlayerSeasonByCompAndTeam};



#[derive(Deserialize)]
struct ToolbarSearchParams {
    page: Option<i32>,
    limit: Option<i32>,
    search_name: Option<String>
}

#[get("/players")]
pub async fn get_players(pool: web::Data<PgPool>, params: web::Query<ToolbarSearchParams>) -> HttpResponse {
    let search_name = params.search_name.as_deref().unwrap_or("");
    let limit = params.limit.unwrap_or(10);
    let page = params.page.unwrap_or(0);

    let mut query = QueryBuilder::new("SELECT * FROM players ");

    if !search_name.is_empty() {
        let names: Vec<&str> = search_name.split_whitespace().collect();
        let count = names.len();
        
        query.push("WHERE ");
        for (i, name) in names.iter().enumerate() {
            query.push("player_code iLIKE ");
            let like_pattern = format!("%{}%", name);
            query.push_bind(like_pattern);
            if i < count - 1 {
                query.push(" AND ");
            }
        }
    }

    query.push( " ORDER BY highest_market_value_in_eur DESC NULLS LAST, name");

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
    comps: Option<String>,
    positions: Option<String>,
    minfrom: Option<i32>,
    minto: Option<i32>,
    minage: Option<i32>,
    maxage: Option<i32>,
    subonly: Option<i32>,
    earliestsub: Option<i32>,
    latestsub: Option<i32>,
    penalty: Option<String>,
    sort: Option<String>
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
    // let minute_from = params.minfrom.unwrap_or(0);
    // let minute_to = params.minto.unwrap_or(0);
    let page = params.page.unwrap_or(0);
    let limit = params.limit.unwrap_or(50);
    let min_age = params.minage.unwrap_or(0);
    let max_age = params.maxage.unwrap_or(0);
    let subs_only: i32 = params.subonly.unwrap_or(0);
    let earliest_sub_on_time = params.earliestsub.unwrap_or(0);
    let latest_sub_on_time = params.latestsub.unwrap_or(0);
    let penalties: &str = params.penalty.as_deref().unwrap_or("ip");
    let sort_by: &str = params.sort.as_deref().unwrap_or("g");

    let seasons: Vec<i32> = params.seasons
        .as_ref()
        .map(|s| s.split(',').filter_map(|s| s.parse().ok()).collect())
        .unwrap_or_else(Vec::new);

    let competitions: Vec<&str> = params.comps
        .as_ref()
        .map(|c| c.split(',').collect())
        .unwrap_or_else(Vec::new);

    let positions: Vec<&str> = params.positions
        .as_ref()
        .map(|p| p.split(',').map(|s| map_position_code_to_position(s)).collect())
        .unwrap_or_else(Vec::new);

    return build_query_from_appearances(page, limit, min_age, max_age, subs_only, earliest_sub_on_time, latest_sub_on_time, penalties, sort_by, seasons, competitions, positions);

    // return build_query_from_events(page, limit, min_age, max_age, subs_only, earliest_sub_on_time, latest_sub_on_time, sort_by, seasons, competitions, positions, minute_from, minute_to);
}




fn build_query_from_appearances<'a>(page: i32, limit: i32, min_age: i32, max_age: i32, subs_only: i32, 
    earliest_sub_on_time: i32, latest_sub_on_time: i32, penalties: &'a str, sort_by: &'a str, seasons: Vec<i32>, 
    competitions: Vec<&str>, positions: Vec<&str>) -> QueryBuilder<'a, Postgres> {

    let mut query = QueryBuilder::new(
        "SELECT a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position,
        COUNT(*) AS total_appearances, SUM(CASE WHEN a.played_from_minute > 0 THEN 1 ELSE 0 END) AS substitute_appearances, ");

    let goals_calculation = goals_query_string(penalties);
    
    query.push(goals_calculation).push( "AS total_goals, ");

    query.push("SUM(a.assists) AS total_assists, SUM(a.yellow_cards) AS total_yellow_cards, 
        SUM(a.red_cards) + SUM(CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END) AS total_red_cards, 
        SUM(a.minutes_played) AS total_minutes_played, STRING_AGG(DISTINCT c.club_id::TEXT, ', ') AS clubs_played_for
        FROM 
            appearances_enhanced a 
        JOIN 
            clubs c ON c.club_id = a.player_club_id
        JOIN
            players p ON p.player_id = a.player_id
        JOIN
            games g ON g.game_id = a.game_id 
        WHERE 1 = 1 ");

    add_seasons_to_query(&mut query, seasons);
    add_competitions_to_query(&mut query, competitions);
    add_positions_to_query(&mut query, positions);
    add_ages_to_query(&mut query, min_age, max_age);
    add_sub_info_to_query(&mut query, subs_only, earliest_sub_on_time, latest_sub_on_time);
    add_group_and_sort_by_to_query(&mut query, sort_by, goals_calculation);
    add_limit_and_offset_to_query(&mut query, limit, page);

    return query;

}

// fn build_query_from_events<'a>(page: i32, limit: i32, min_age: i32, max_age: i32, subs_only: i32, 
//     earliest_sub_on_time: i32, latest_sub_on_time: i32, sort_by: &'a str, seasons: Vec<i32>, 
//     competitions: Vec<&str>, positions: Vec<&str>, minute_from: i32, minute_to: i32) -> QueryBuilder<'a, Postgres> {
    

//     }


fn goals_query_string(penalties: &str) -> &str {
    match penalties {
    "ep" => "SUM(a.goals) - SUM(a.penalty_goals) ",
        "op" => "SUM(a.penalty_goals) ",
        _ => "SUM(a.goals) "
    }
}

fn add_seasons_to_query(query: &mut QueryBuilder<Postgres>, seasons: Vec<i32>) {
    if !seasons.is_empty() {
        query.push("AND season IN (");

        for (i, season) in seasons.into_iter().enumerate() {
            if i > 0 {
                query.push(", ");
            }
            query.push_bind(season);
        }

        query.push(") ");
    };
}

fn add_competitions_to_query(query: &mut QueryBuilder<Postgres>, competitions: Vec<&str>) {
    if !competitions.is_empty() {
        query.push("AND a.competition_id IN (");

        for (i, competition) in competitions.into_iter().enumerate() {
            if i > 0 {
                query.push(", ");
            }
            query.push_bind(competition.to_string());
        }
        query.push(") ");
    }
}

fn add_positions_to_query(query: &mut QueryBuilder<Postgres>, positions: Vec<&str>) {
    if !positions.is_empty() {
        query.push("AND p.sub_position IN (");

        for (i, position) in positions.into_iter().enumerate() {
            if i > 0 {
                query.push(", ");
            }
            query.push_bind(position.to_string());
        }
        query.push(") ");
    }
}

fn add_ages_to_query(query: &mut QueryBuilder<Postgres>, min_age: i32, max_age: i32) {
    if min_age > 0 {
        query.push("AND EXTRACT (YEAR FROM age(a.date, p.date_of_birth)) >= ").push_bind(min_age).push(" ");
    }

    if max_age > 0 {
        query.push("AND EXTRACT (YEAR FROM age(a.date, p.date_of_birth)) <= ").push_bind(max_age).push(" ");
    }
}

fn add_sub_info_to_query(query: &mut QueryBuilder<Postgres>, subs_only: i32, earliest_sub_on_time: i32, latest_sub_on_time: i32) {
    if subs_only > 0 {
        query.push("AND a.played_from_minute > ").push_bind(if earliest_sub_on_time > 0 { earliest_sub_on_time - 1 } else { 0 }).push(" ");

        if latest_sub_on_time > 0 {
            query.push("AND a.played_from_minute <= ").push_bind(latest_sub_on_time).push(" ");
        }
    }
}

fn add_group_and_sort_by_to_query(query: &mut QueryBuilder<Postgres>, sort_by: &str, goals_calculation: &str) {
    query.push("
    GROUP BY 
        a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position
    ORDER BY ");

    // Sort parameter shortened in URL for efficiency
    let sort_clause = match sort_by {
        // Goals
        "g" => goals_calculation.to_string() + "DESC, SUM(a.assists) DESC, SUM(a.minutes_played) ASC, SUM(a.red_cards) ASC, SUM(a.yellow_cards) ASC, a.player_name",
        // Assists
        "a" => "SUM(a.assists) DESC, ".to_owned() + goals_calculation + "DESC, a.player_name",
        // Goals and Assists combined
        "ga" => "SUM(a.assists) + ".to_owned() + goals_calculation + "DESC, SUM(a.goals) DESC, a.player_name",
        // Appearances
        "ap" => "COUNT(*) DESC, SUM(a.minutes_played) DESC, a.player_name".to_string(),
        // Total minutes played
        "m" => "SUM(a.minutes_played) DESC, COUNT(*) DESC, a.player_name".to_string(),
        // Yellow cards
        "y" => "SUM(a.yellow_cards) DESC, SUM(a.red_cards) DESC, a.player_name".to_string(),
        // Red cards
        "r" => "SUM(a.red_cards) + SUM(CASE
            WHEN a.yellow_cards >= 2 THEN 1
            ELSE 0
            END) DESC, SUM(a.yellow_cards) DESC, a.player_name".to_string(),
        _ => "SUM(a.goals) DESC, SUM(a.assists) DESC, SUM(a.minutes_played) ASC, SUM(a.red_cards) ASC, SUM(a.yellow_cards) ASC, a.player_name".to_string()
    };

    query.push(sort_clause);
}

fn add_limit_and_offset_to_query(query: &mut QueryBuilder<Postgres>, limit: i32, page: i32) {
    query.push(" LIMIT ").push_bind(limit).push(" OFFSET ").push_bind(page * limit);
}
