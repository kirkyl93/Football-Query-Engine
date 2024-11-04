use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Clone, Deserialize, FromRow)]
pub struct Club {
    club_id: i32,
    name: String,
}