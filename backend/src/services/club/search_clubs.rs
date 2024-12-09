use actix_web::{get, web, HttpResponse};
use serde::Deserialize;
use sqlx::{PgPool, Postgres, QueryBuilder};
use crate::club::Club;
use crate::services::base_query_builder::BaseQueryMethods;

#[derive(Deserialize)]
struct ToolbarSearchParams {
    page: Option<i32>,
    limit: Option<i32>,
    search_name: Option<String>,
}

trait ClubQueryMethods<'a> {
    fn add_club_name_to_query(&mut self, club_name: &str) -> &mut Self;
}

impl<'a> ClubQueryMethods<'a> for QueryBuilder<'a, Postgres> {
    fn add_club_name_to_query(&mut self, club_name: &str) -> &mut Self {
        if !club_name.is_empty() {
            let names: Vec<&str> = club_name.split_whitespace().collect();
            let count = names.len();

            self.push("AND ");
            for (i, name) in names.iter().enumerate() {
                self.push("club_code iLIKE ");
                let like_pattern = format!("%{}%", name);
                self.push_bind(like_pattern).push(" ");
                if i < count - 1 {
                    self.push("AND ");
                }
            }
        }
        self
    }
}

#[get("/clubs")]
pub async fn get_clubs(pool: web::Data<PgPool>, params: web::Query<ToolbarSearchParams>) -> HttpResponse {
    let search_name = params.search_name.as_deref().unwrap_or("");
    let limit = params.limit.unwrap_or(10).min(100);
    let page = params.page.unwrap_or(0).max(0);

    let mut query = QueryBuilder::new("");

    query.push("SELECT club_id, name FROM clubs WHERE 1=1 ")
        .add_club_name_to_query(search_name)
        .push(" ORDER BY stadium_seats DESC NULLS LAST, name")
        .add_limit_and_offset(limit, page);

    match query.build_query_as::<Club>()
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(clubs) => HttpResponse::Ok().json(clubs),
        Err(err) => {
            println!("{:?}", err.as_database_error());
            HttpResponse::InternalServerError().json(err.to_string())
        }
    }
}