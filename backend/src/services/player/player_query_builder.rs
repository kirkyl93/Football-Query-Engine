use sqlx::{Postgres, QueryBuilder};
use crate::services::player::models::{HomeAwayOption, PenaltyOption, ProcessedSearchParams, StatScope};

pub trait PlayerFilterMethods<'a> {
    fn add_player_filters(&mut self, params: &ProcessedSearchParams) -> &mut Self;
}

impl<'a> PlayerFilterMethods<'a> for QueryBuilder<'a, Postgres> {
    fn add_player_filters(&mut self, params: &ProcessedSearchParams) -> &mut Self {
        self.add_seasons(params.seasons().clone())
            .add_competitions(params.competitions().clone())
            .add_positions(params.positions().clone())
            .add_ages(params.minimum_age(), params.maximum_age())
            .add_height(params.minimum_height(), params.maximum_height())
            .add_home_or_away(params.home_or_away())
            .add_player_names(params.names())
            .add_player_countries(params.countries().clone())
            .add_clubs_played_for(params.clubs_played_for().clone())
            .add_clubs_played_against(params.clubs_played_against().clone())
            .add_sub_info(params.subs_only(), params.earliest_sub_on_time(), params.latest_sub_on_time())
    }
}

trait PrivatePlayerFilterMethods<'a> {
    fn add_seasons(&mut self, seasons: Vec<i32>) -> &mut Self;
    fn add_competitions(&mut self, competitions: Vec<String>) -> &mut Self;
    fn add_positions(&mut self, positions: Vec<String>) -> &mut Self;
    fn add_home_or_away(&mut self, home_or_away: &HomeAwayOption) -> &mut Self;
    fn add_height(&mut self, min_height: i32, max_height: i32) -> &mut Self;
    fn add_ages(&mut self, min_age: i32, max_age: i32) -> &mut Self;
    fn add_player_names(&mut self, player_names: &Vec<String>) -> &mut Self;
    fn add_player_countries(&mut self, player_countries: Vec<String>) -> &mut Self;
    fn add_clubs_played_for(&mut self, clubs_played_for: Vec<i32>) -> &mut Self;
    fn add_clubs_played_against(&mut self, clubs_played_against: Vec<i32>) -> &mut Self;
    fn add_sub_info(&mut self, subs_only: i32, earliest_sub_on_time: i32, latest_sub_on_time: i32) -> &mut Self;
}

impl<'a> PrivatePlayerFilterMethods<'a> for QueryBuilder<'a, Postgres> {
    fn add_seasons(&mut self, seasons: Vec<i32>) -> &mut Self {
        if !seasons.is_empty() {
            self.push("
            AND season IN (");

            for (i, season) in seasons.into_iter().enumerate() {
                if i > 0 {
                    self.push(", ");
                }
                self.push_bind(season);
            }

            self.push(")");
        }

        self
    }

    fn add_competitions(&mut self, competitions: Vec<String>) -> &mut Self {
        if !competitions.is_empty() {
            self.push("
            AND a.competition_id IN (");

            for (i, competition) in competitions.into_iter().enumerate() {
                if i > 0 {
                    self.push(", ");
                }
                self.push_bind(competition);
            }
            self.push(")");
        }

        self
    }

    fn add_positions(&mut self, positions: Vec<String>) -> &mut Self {
        if !positions.is_empty() {
            self.push("
            AND p.sub_position IN (");

            for (i, position) in positions.into_iter().enumerate() {
                if i > 0 {
                    self.push(", ");
                }
                self.push_bind(position);
            }
            self.push(")");
        }

        self
    }

    fn add_home_or_away(&mut self, home_or_away: &HomeAwayOption) -> &mut Self {
        let home_or_away = match home_or_away {
            HomeAwayOption::Home => "
            AND player_club_id = home_club_id",
            HomeAwayOption::Away => "
            AND player_club_id = away_club_id",
            _ => ""
        };

        if !home_or_away.is_empty() {
            self.push(home_or_away);
        }

        self
    }

    fn add_height(&mut self, min_height: i32, max_height: i32) -> &mut Self {
        if min_height > 0 {
            self.push("
            AND height_in_cm >= ").push_bind(min_height);
        }

        if max_height > 0 {
            self.push("
            AND height_in_cm <= ").push_bind(max_height);
        }

        self
    }

    fn add_ages(&mut self, min_age: i32, max_age: i32) -> &mut Self {
        if min_age > 0 {
            self.push("
            AND EXTRACT (YEAR FROM age(a.date, p.date_of_birth)) >= ").push_bind(min_age);
        }

        if max_age > 0 {
            self.push("
            AND EXTRACT (YEAR FROM age(a.date, p.date_of_birth)) <= ").push_bind(max_age);
        }

        self
    }

    fn add_player_names(&mut self, player_names: &Vec<String>) -> &mut Self {
        if !player_names.is_empty() {
            let name_count = player_names.len();
            self.push("
            AND (");
            for (i, name) in player_names.iter().enumerate() {
                let names: Vec<String> = name.split_whitespace().map(String::from).collect();
                let count = names.len();
                for (j, name) in names.iter().enumerate() {
                    self.push("player_code iLIKE ");
                    let like_pattern = format!("%{}%", name);
                    self.push_bind(like_pattern).push(" ");
                    if j < count - 1 {
                        self.push("AND ");
                    }
                }
                if i < name_count - 1 {
                    self.push("OR ");
                }
            }
            self.push(")");
        }

        self
    }

    fn add_player_countries(&mut self, player_countries: Vec<String>) -> &mut Self {
        if !player_countries.is_empty() {
            self.push("
            AND country_of_citizenship IN (");

            for (i, country) in player_countries.into_iter().enumerate() {
                if i > 0 {
                    self.push(", ");
                }
                self.push_bind(country);
            }
            self.push(")");
        }

        self
    }

    fn add_clubs_played_for(&mut self, clubs_played_for: Vec<i32>) -> &mut Self {
        if !clubs_played_for.is_empty() {
            self.push("
            AND player_club_id IN (");

            for (i, club) in clubs_played_for.into_iter().enumerate() {
                if i > 0 {
                    self.push(", ");
                }
                self.push_bind(club);
            }
            self.push(")");
        }

        self
    }

    fn add_clubs_played_against(&mut self, clubs_played_against: Vec<i32>) -> &mut Self {
        if !clubs_played_against.is_empty() {
            self.push("
            AND (");

            for (i, club_id) in clubs_played_against.into_iter().enumerate() {
                if i > 0 {
                    self.push(" OR ");
                }

                self.push("(")
                    .push_bind(club_id)
                    .push(" = home_club_id AND player_club_id != ")
                    .push_bind(club_id)
                    .push(")");

                self.push(" OR (")
                    .push_bind(club_id)
                    .push(" = away_club_id AND player_club_id != ")
                    .push_bind(club_id)
                    .push(")");
            }
            self.push(")");
        }

        self
    }


    fn add_sub_info(&mut self, subs_only: i32, earliest_sub_on_time: i32, latest_sub_on_time: i32) -> &mut Self {
        if subs_only > 0 {
            self.push("
            AND a.played_from_minute > ").push_bind(if earliest_sub_on_time > 0 { earliest_sub_on_time - 1 } else { 0 });

            if latest_sub_on_time > 0 {
                self.push("
                AND a.played_from_minute <= ").push_bind(latest_sub_on_time);
            }
        }

        self
    }
}

pub trait PlayerMinuteFilterMethods<'a> {
    fn construct_appearances_table_using_minute_filters(&mut self, params: &ProcessedSearchParams) -> &mut Self;
}

impl<'a> PlayerMinuteFilterMethods<'a> for QueryBuilder<'a, Postgres> {
    fn construct_appearances_table_using_minute_filters(&mut self, params: &ProcessedSearchParams) -> &mut Self {
        self.push("
        WITH games_minute_appearance_filter AS
        (SELECT a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, c.club_id, g.game_id,")
            .push(if *params.scope() == StatScope::Season {" g.season AS season,"} else {""})
            .add_all_minute_filters(params.minute_played_from(), params.minute_played_to())
            .push("
            MIN(CASE WHEN a.played_from_minute > 0 THEN 1 ELSE 0 END) AS substitute_appearances
            FROM
                appearances_enhanced a
            JOIN
                clubs c ON c.club_id = a.player_club_id
            JOIN
                players p ON p.player_id = a.player_id
            JOIN
                games g ON g.game_id = a.game_id
            LEFT JOIN
                game_events e ON e.game_id = a.game_id AND (e.player_id = a.player_id OR e.player_assist_id = a.player_id)
            WHERE 1 = 1")
            .add_player_filters(params)
            .push("
            GROUP BY a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, c.club_id, g.game_id)

    ")
    }
}

trait PrivatePlayerMinuteFilterMethods<'a> {
    fn add_all_minute_filters(&mut self, minute_from: i32, minute_to: i32) -> &mut Self;
    fn add_appearances_minute_filter(&mut self, minute_from: i32, minute_to: i32) -> &mut Self;
    fn add_goals_minute_filter(&mut self, minute_from: i32, minute_to: i32) -> &mut Self;
    fn add_penalties_minute_filter(&mut self, minute_from: i32, minute_to: i32) -> &mut Self;
    fn add_assists_minute_filter(&mut self, minute_from: i32, minute_to: i32) -> &mut Self;
    fn add_yellows_minute_filter(&mut self, minute_from: i32, minute_to: i32) -> &mut Self;
    fn add_reds_minute_filter(&mut self, minute_from: i32, minute_to: i32) -> &mut Self;
    fn add_minutes_played_minute_filter(&mut self, minute_from: i32, minute_to: i32) -> &mut Self;
}

impl<'a> PrivatePlayerMinuteFilterMethods<'a> for QueryBuilder<'a, Postgres> {
    fn add_all_minute_filters(&mut self, minute_from: i32, minute_to: i32) -> &mut Self {
        self.add_appearances_minute_filter(minute_from, minute_to)
            .add_goals_minute_filter(minute_from, minute_to)
            .add_penalties_minute_filter(minute_from, minute_to)
            .add_assists_minute_filter(minute_from, minute_to)
            .add_yellows_minute_filter(minute_from, minute_to)
            .add_reds_minute_filter(minute_from, minute_to)
            .add_minutes_played_minute_filter(minute_from, minute_to)
    }

    fn add_appearances_minute_filter(&mut self, minute_from: i32, minute_to: i32) -> &mut Self {
        self.push("
            MIN(CASE WHEN a.played_from_minute <= ").push_bind(minute_to)
            .push(" AND (subbed_off_minute IS NULL OR subbed_off_minute > ").push_bind(minute_from).push(")
                AND played_from_minute + minutes_played >= ").push_bind(minute_from)
            .push(" THEN 1 ELSE 0 END) AS appearances,");

        self
    }

    fn add_goals_minute_filter(&mut self, minute_from: i32, minute_to: i32) -> &mut Self {
        self.push("
            CAST(SUM(CASE WHEN e.type = 'Goals' AND e.player_id = a.player_id AND e.minute BETWEEN ").push_bind(minute_from)
            .push(" AND ").push_bind(minute_to).push(" THEN 1 ELSE 0 END) AS integer) AS goals,");

        self
    }

    fn add_penalties_minute_filter(&mut self, minute_from: i32, minute_to: i32) -> &mut Self {
        self.push("
            CAST(SUM(CASE WHEN e.type = 'Goals' AND e.player_id = a.player_id AND e.minute BETWEEN ").push_bind(minute_from)
            .push(" AND ").push_bind(minute_to).push(" AND e.description ILIKE '%penalty%' THEN 1 ELSE 0 END) AS integer) AS penalty_goals,");

        self
    }

    fn add_assists_minute_filter(&mut self, minute_from: i32, minute_to: i32) -> &mut Self {
        self.push("
            CAST(SUM(CASE WHEN e.type = 'Goals' AND e.player_assist_id = a.player_id AND e.minute BETWEEN ").push_bind(minute_from)
            .push(" AND ").push_bind(minute_to).push(" AND e.player_id != e.player_assist_id THEN 1 ELSE 0 END) AS integer) AS assists,");

        self
    }

    fn add_yellows_minute_filter(&mut self, minute_from: i32, minute_to: i32) -> &mut Self {
        self.push("
            CAST(SUM(CASE WHEN e.type = 'Cards' AND e.player_id = a.player_id AND e.minute BETWEEN ").push_bind(minute_from)
            .push(" AND ").push_bind(minute_to).push(" AND e.description ILIKE '%yellow%' THEN 1 ELSE 0 END) AS integer) AS yellow_cards,");

        self
    }

    fn add_reds_minute_filter(&mut self, minute_from: i32, minute_to: i32) -> &mut Self {
        self.push("
            CAST(SUM(CASE WHEN e.type = 'Cards' AND e.player_id = a.player_id AND e.minute BETWEEN ").push_bind(minute_from)
            .push(" AND ").push_bind(minute_to)
            .push(" AND e.description ILIKE '%red%' THEN 1 ELSE 0 END)
                + CASE WHEN SUM(CASE WHEN e.type = 'Cards' AND e.player_id = a.player_id AND e.minute BETWEEN 0 AND ").push_bind(minute_to)
            .push(" AND e.description ILIKE '%yellow%' THEN 1 ELSE 0 END) >= 2
                AND SUM(CASE WHEN e.type = 'Cards' AND e.player_id = a.player_id AND e.minute BETWEEN ").push_bind(minute_from).push(" AND ").push_bind(minute_to)
            .push(" AND e.description ILIKE '%yellow%' THEN 1 ELSE 0 END) >= 1 THEN 1 ELSE 0 END AS integer) AS red_cards,");

        self
    }

    fn add_minutes_played_minute_filter(&mut self, minute_from: i32, minute_to: i32) -> &mut Self {
        self.push("
            MIN(LEAST(").push_bind(minute_to).push(", subbed_off_minute, played_from_minute + minutes_played) - GREATEST(").push_bind(minute_from).push(", played_from_minute)) + 1 AS minutes_played,");

        self
    }
}

pub fn get_goals_calculation(penalties: &PenaltyOption, game_scope_query: bool) -> String {
    if game_scope_query {
        match penalties {
            PenaltyOption::ExcludePenalties => "goals - penalty_goals".into(),
            PenaltyOption::OnlyPenalties => "penalty_goals".into(),
            _ => "goals".into()
        }
    } else {
        match penalties {
            PenaltyOption::ExcludePenalties => "SUM(a.goals) - SUM(a.penalty_goals)".into(),
            PenaltyOption::OnlyPenalties => "SUM(a.penalty_goals)".into(),
            _ => "SUM(a.goals)".into()
        }
    }
}