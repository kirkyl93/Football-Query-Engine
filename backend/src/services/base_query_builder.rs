use serde::Deserialize;
use sqlx::{Postgres, QueryBuilder};

pub trait BaseQueryMethods {
    fn add_limit_and_offset(&mut self, limit: i32, page: i32) -> &mut Self;
    /// Adds `AND <column> ILIKE %token% ESCAPE '\' AND ...` for each
    /// whitespace-separated token in `value`. No-op when blank.
    /// `column` is caller-controlled (never raw user input).
    fn add_tokenized_ilike(&mut self, column: &str, value: &str) -> &mut Self;
}

impl BaseQueryMethods for QueryBuilder<Postgres> {
    fn add_limit_and_offset(&mut self, limit: i32, page: i32) -> &mut Self {
        let limit = limit.clamp(1, 100);
        let page = page.max(0);
        let offset = (page as i64) * (limit as i64);

        self.push("\nLIMIT ").push_bind(limit);
        self.push("\nOFFSET ").push_bind(offset);

        self
    }

    fn add_tokenized_ilike(&mut self, column: &str, value: &str) -> &mut Self {
        if value.trim().is_empty() {
            return self;
        }
        let tokens: Vec<&str> = value.split_whitespace().collect();
        if tokens.is_empty() {
            return self;
        }

        self.push("AND ");
        for (i, token) in tokens.iter().enumerate() {
            self.push(format!("{column} iLIKE "));
            self.push_bind(format!("%{}%", escape_like_pattern(token)));
            self.push(" ESCAPE '\\' ");
            if i + 1 < tokens.len() {
                self.push("AND ");
            }
        }
        self
    }
}

/// Escapes `%`, `_` and `\` so user input can't act as LIKE wildcards.
pub fn escape_like_pattern(token: &str) -> String {
    let mut out = String::with_capacity(token.len());
    for ch in token.chars() {
        if ch == '%' || ch == '_' || ch == '\\' {
            out.push('\\');
        }
        out.push(ch);
    }
    out
}

/// Shared `?page=&limit=&search_name=` params for toolbar lookups.
/// Lenient by design: invalid/negative values fall back to defaults.
#[derive(Deserialize, Default)]
pub struct ToolbarSearchParams {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub search_name: Option<String>,
}

impl ToolbarSearchParams {
    pub fn normalized_page(&self) -> i32 {
        self.page.unwrap_or(0).max(0)
    }

    pub fn normalized_limit(&self, default: i32) -> i32 {
        self.limit.unwrap_or(default).clamp(1, 100)
    }

    pub fn search_name_or_empty(&self) -> &str {
        self.search_name.as_deref().unwrap_or("")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escape_like_pattern_escapes_wildcards() {
        assert_eq!(escape_like_pattern("100%_x\\y"), "100\\%\\_x\\\\y");
    }

    #[test]
    fn toolbar_params_are_lenient() {
        let p = ToolbarSearchParams {
            page: Some(-3),
            limit: Some(999),
            search_name: None,
        };
        assert_eq!(p.normalized_page(), 0);
        assert_eq!(p.normalized_limit(10), 100);
        assert_eq!(p.search_name_or_empty(), "");
    }
}
