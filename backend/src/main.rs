mod player_queries;
mod club_queries;
mod player;
mod countries;
mod competitions;
mod club;

use actix_cors::Cors;
use actix_web::{web::{self}, App, HttpServer};
use dotenv::dotenv;
use player_queries::{get_players, fetch_player, fetch_player_stats_by_season, search};
use sqlx::postgres::PgPoolOptions;
use club_queries::{get_clubs};

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
            .service(search)
            .service(get_clubs)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
