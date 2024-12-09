use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(PartialEq, Debug, Serialize, Clone, Deserialize, FromRow)]
pub struct Club {
    club_id: i32,
    name: String,
}

impl Club {
    #[allow(dead_code)]
    pub fn new(club_id: i32, name: String) -> Self {
        Self { club_id, name }
    }
}