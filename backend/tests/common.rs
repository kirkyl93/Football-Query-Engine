use dotenv::dotenv;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;

pub async fn setup_test_db() -> PgPool {
    dotenv().ok();
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Error building a connection pool")
}

