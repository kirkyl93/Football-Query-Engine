use crate::club::Club;
use crate::services::base_query_builder::{BaseQueryMethods, ToolbarSearchParams};
use crate::services::errors::db_list_result;
use actix_web::{HttpResponse, get, web};
use sqlx::{PgPool, Postgres, QueryBuilder};

trait ClubQueryMethods {
    fn add_club_name_to_query(&mut self, club_name: &str) -> &mut Self;
}

impl ClubQueryMethods for QueryBuilder<Postgres> {
    fn add_club_name_to_query(&mut self, club_name: &str) -> &mut Self {
        self.add_tokenized_ilike("club_code", club_name)
    }
}

#[get("/clubs")]
pub async fn get_clubs(
    pool: web::Data<PgPool>,
    params: web::Query<ToolbarSearchParams>,
) -> HttpResponse {
    let limit = params.normalized_limit(10);
    let page = params.normalized_page();

    let mut query = QueryBuilder::new("");

    query
        .push("SELECT club_id, name FROM clubs WHERE 1=1 ")
        .add_club_name_to_query(params.search_name_or_empty())
        .push(" ORDER BY stadium_seats DESC NULLS LAST, name")
        .add_limit_and_offset(limit, page);

    db_list_result(
        query
            .build_query_as::<Club>()
            .fetch_all(pool.get_ref())
            .await,
    )
}
