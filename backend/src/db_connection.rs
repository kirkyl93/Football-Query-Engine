use tokio_postgres::{Client, NoTls};
use std::env;
use dotenv::dotenv;

pub struct DbConnection {
    pub client: Client,
}

impl DbConnection {
    pub async fn new() -> Result <Self, Box<dyn std::error::Error>> {
        dotenv().ok();

        let db_host = env::var("DB_HOST")?;
        let db_user = env::var("DB_USER")?;
        let db_password = env::var("DB_PASSWORD")?;
        let db_name = env::var("DB_NAME")?;

        let conn_str = format!(
            "host={} user={} password={} dbname={}",
            db_host, db_user, db_password, db_name
        );

        let (client, connection) = tokio_postgres::connect(&conn_str, NoTls).await?;

        tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("connection error: {}", e);
            }
        });

        Ok(DbConnection { client })


    }
}