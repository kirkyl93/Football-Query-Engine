use sqlx::{Postgres, QueryBuilder};

pub trait BaseQueryMethods<'a> {
    fn add_limit_and_offset(&mut self, limit: i32, page: i32) -> &mut Self;
}

impl<'a> BaseQueryMethods<'a> for QueryBuilder<Postgres> {
    fn add_limit_and_offset(&mut self, limit: i32, page: i32) -> &mut Self {
        self.push("
        LIMIT ").push_bind(limit);

        self.push("
        OFFSET ").push_bind(page * limit);

        self
    }
}