
mod countries;
mod club;
mod competitions;
mod services;

use actix_cors::Cors;
use actix_web::{web::{self}, App, HttpServer};
use dotenv::dotenv;
use sqlx::postgres::PgPoolOptions;
use crate::services::club::search_clubs::get_clubs;
use crate::services::player::search_by_count::search_by_count;
use crate::services::player::search_by_game::search_by_game;
use crate::services::player::search_by_season_or_across_seasons::search_by_season_or_across_seasons;
use crate::services::player::search_players::{fetch_player, fetch_player_stats_by_season, get_player_games, get_players};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Error building a connection pool");

    HttpServer::new(move || {
        App::new()
            .wrap(
                Cors::default()
                    .allowed_origin("http://localhost:3000")
                    .max_age(3600)
            )
            .app_data(web::Data::new(pool.clone()))
            .service(get_players)
            .service(fetch_player)
            .service(fetch_player_stats_by_season)
            .service(search_by_season_or_across_seasons)
            .service(search_by_game)
            .service(get_clubs)
            .service(search_by_count)
            .service(get_player_games)
    })
        .bind(("127.0.0.1", 8080))?
        .run()
        .await
}
