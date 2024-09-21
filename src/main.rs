mod player_queries;
mod player;
mod countries;
mod competitions;

use actix_cors::Cors;
use actix_web::{web::Data, App, HttpServer};
use dotenv::dotenv;
use player_queries::{fetch_player, fetch_player_stats_by_season, search};
use sqlx::{postgres::PgPoolOptions, Pool, Postgres};

pub struct AppState {
    db: Pool<Postgres>
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Error building a connection pool");


    let state = Data::new(AppState {
        db: pool,
    });

    HttpServer::new(move || {
        App::new()
        .wrap(
            Cors::default()
                .allowed_origin("http://localhost:3000/")
                .allow_any_origin()
                .max_age(3600)
        )
            .app_data(state.clone())
            .service(fetch_player)
            .service(fetch_player_stats_by_season)
            .service(search)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
