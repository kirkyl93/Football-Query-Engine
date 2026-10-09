use crate::competitions::Competition;
use crate::countries::Country;
use crate::services::base_query_builder::escape_like_pattern;
use crate::services::player::models::{
    AgeRange, HeightRange, HomeAwayOption, MinuteWindow, PenaltyOption, ProcessedSearchParams, StatScope, SubFilter
};
use crate::services::player::player_enums::PlayerSubPosition;
use sqlx::{Postgres, QueryBuilder};

/// Which aggregation level the goals expression targets.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TotalsKind {
    PerGame,
    PerSeason,
}

pub trait PlayerFilterMethods {
    fn add_player_filters(&mut self, params: &ProcessedSearchParams) -> &mut Self;
}

impl PlayerFilterMethods for QueryBuilder<Postgres> {
    fn add_player_filters(&mut self, params: &ProcessedSearchParams) -> &mut Self {
        self.add_seasons(&params.seasons)
            .add_competitions(&params.competitions)
            .add_positions(&params.positions)
            .add_ages(params.age)
            .add_height(params.height)
            .add_home_or_away(&params.home_or_away)
            .add_player_names(&params.names)
            .add_player_countries(&params.countries)
            .add_clubs_played_for(&params.clubs_played_for)
            .add_clubs_played_against(&params.clubs_played_against)
            .add_sub_info(params.subs)
    }
}

trait PrivatePlayerFilterMethods {
    fn add_seasons(&mut self, seasons: &[i32]) -> &mut Self;
    fn add_competitions(&mut self, competitions: &[Competition]) -> &mut Self;
    fn add_positions(&mut self, positions: &[PlayerSubPosition]) -> &mut Self;
    fn add_home_or_away(&mut self, home_or_away: &HomeAwayOption) -> &mut Self;
    fn add_height(&mut self, height: HeightRange) -> &mut Self;
    fn add_ages(&mut self, age: AgeRange) -> &mut Self;
    fn add_player_names(&mut self, player_names: &[String]) -> &mut Self;
    fn add_player_countries(&mut self, player_countries: &[Country]) -> &mut Self;
    fn add_clubs_played_for(&mut self, clubs_played_for: &[i32]) -> &mut Self;
    fn add_clubs_played_against(&mut self, clubs_played_against: &[i32]) -> &mut Self;
    fn add_sub_info(&mut self, subs: SubFilter) -> &mut Self;
}

impl PrivatePlayerFilterMethods for QueryBuilder<Postgres> {
    fn add_seasons(&mut self, seasons: &[i32]) -> &mut Self {
        if !seasons.is_empty() {
            self.push(
                "
            AND season IN (",
            );

            for (i, season) in seasons.iter().enumerate() {
                if i > 0 {
                    self.push(", ");
                }
                self.push_bind(*season);
            }

            self.push(")");
        }

        self
    }

    fn add_competitions(&mut self, competitions: &[Competition]) -> &mut Self {
        if !competitions.is_empty() {
            self.push(
                "
            AND a.competition_id IN (",
            );

            for (i, competition) in competitions.iter().enumerate() {
                if i > 0 {
                    self.push(", ");
                }
                self.push_bind(competition.competition_code());
            }
            self.push(")");
        }

        self
    }

    fn add_positions(&mut self, positions: &[PlayerSubPosition]) -> &mut Self {
        if !positions.is_empty() {
            self.push(
                "
            AND p.sub_position IN (",
            );

            for (i, position) in positions.iter().enumerate() {
                if i > 0 {
                    self.push(", ");
                }
                self.push_bind(position.as_str());
            }
            self.push(")");
        }

        self
    }

    fn add_home_or_away(&mut self, home_or_away: &HomeAwayOption) -> &mut Self {
        let home_or_away = match home_or_away {
            HomeAwayOption::Home => {
                "
            AND player_club_id = home_club_id"
            }
            HomeAwayOption::Away => {
                "
            AND player_club_id = away_club_id"
            }
            _ => "",
        };

        if !home_or_away.is_empty() {
            self.push(home_or_away);
        }

        self
    }

    fn add_height(&mut self, height: HeightRange) -> &mut Self {
        if height.min > 0 {
            self.push(
                "
            AND height_in_cm >= ",
            )
            .push_bind(height.min);
        }

        if height.max > 0 {
            self.push(
                "
            AND height_in_cm <= ",
            )
            .push_bind(height.max);
        }

        self
    }

    fn add_ages(&mut self, age: AgeRange) -> &mut Self {
        if age.min > 0 {
            self.push(
                "
            AND p.date_of_birth <= (a.date - make_interval(years => ",
            )
            .push_bind(age.min)
            .push("))");
        }

        if age.max > 0 {
            self.push(
                "
            AND p.date_of_birth > (a.date - make_interval(years => ",
            )
            .push_bind(age.max + 1)
            .push("))");
        }

        self
    }

    fn add_player_names(&mut self, player_names: &[String]) -> &mut Self {
        if !player_names.is_empty() {
            let name_count = player_names.len();
            self.push(
                "
            AND (",
            );
            for (i, name) in player_names.iter().enumerate() {
                let tokens: Vec<&str> = name.split_whitespace().collect();
                let count = tokens.len();
                for (j, token) in tokens.iter().enumerate() {
                    self.push("player_code iLIKE ");
                    self.push_bind(format!("%{}%", escape_like_pattern(token)));
                    self.push(" ESCAPE '\\' ");
                    if j + 1 < count {
                        self.push("AND ");
                    }
                }
                if i + 1 < name_count {
                    self.push("OR ");
                }
            }
            self.push(")");
        }

        self
    }

    fn add_player_countries(&mut self, player_countries: &[Country]) -> &mut Self {
        if !player_countries.is_empty() {
            self.push(
                "
            AND country_of_citizenship IN (",
            );

            for (i, country) in player_countries.iter().enumerate() {
                if i > 0 {
                    self.push(", ");
                }
                self.push_bind(country.as_str());
            }
            self.push(")");
        }

        self
    }

    fn add_clubs_played_for(&mut self, clubs_played_for: &[i32]) -> &mut Self {
        if !clubs_played_for.is_empty() {
            self.push(
                "
            AND player_club_id IN (",
            );

            for (i, club) in clubs_played_for.iter().enumerate() {
                if i > 0 {
                    self.push(", ");
                }
                self.push_bind(*club);
            }
            self.push(")");
        }

        self
    }

    fn add_clubs_played_against(&mut self, clubs_played_against: &[i32]) -> &mut Self {
        if !clubs_played_against.is_empty() {
            self.push(
                "
            AND (",
            );

            for (i, club_id) in clubs_played_against.iter().enumerate() {
                if i > 0 {
                    self.push(" OR ");
                }

                self.push("(")
                    .push_bind(*club_id)
                    .push(" = home_club_id AND player_club_id != ")
                    .push_bind(*club_id)
                    .push(")");

                self.push(" OR (")
                    .push_bind(*club_id)
                    .push(" = away_club_id AND player_club_id != ")
                    .push_bind(*club_id)
                    .push(")");
            }
            self.push(")");
        }

        self
    }

    fn add_sub_info(&mut self, subs: SubFilter) -> &mut Self {
        if subs.only > 0 {
            self.push(
                "
            AND a.played_from_minute > ",
            )
            .push_bind(if subs.earliest_on > 0 {
                subs.earliest_on - 1
            } else {
                0
            });

            if subs.latest_on > 0 {
                self.push(
                    "
                AND a.played_from_minute <= ",
                )
                .push_bind(subs.latest_on);
            }
        }

        self
    }
}

pub trait PlayerMinuteFilterMethods {
    fn construct_appearances_table_using_minute_filters(
        &mut self,
        params: &ProcessedSearchParams,
    ) -> &mut Self;
}

impl PlayerMinuteFilterMethods for QueryBuilder<Postgres> {
    fn construct_appearances_table_using_minute_filters(
        &mut self,
        params: &ProcessedSearchParams,
    ) -> &mut Self {
        self.push(
            "
        WITH games_minute_appearance_filter AS
        (SELECT a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, c.club_id, g.game_id,",
        )
        .push(if params.scope == StatScope::Season {
            " g.season AS season,"
        } else {
            ""
        })
        .add_all_minute_filters(params.minute_window)
        .push(
            "
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
                game_events e ON e.game_id = a.game_id AND (e.player_id = a.player_id OR e.player_assist_id = a.player_id) AND e.type IN ('Goals', 'Cards') AND e.minute <= ",
        )
        .push_bind(params.minute_window.to)
        .push(
            "
            WHERE 1 = 1",
        )
        .add_player_filters(params)
        .push(
            "
            GROUP BY a.player_id, a.player_name, p.image_url, p.country_of_citizenship, p.sub_position, c.club_id, g.game_id)

    ",
        )
    }
}

trait PrivatePlayerMinuteFilterMethods {
    fn add_all_minute_filters(&mut self, window: MinuteWindow) -> &mut Self;
    fn add_appearances_minute_filter(&mut self, window: MinuteWindow) -> &mut Self;
    fn add_goals_minute_filter(&mut self, window: MinuteWindow) -> &mut Self;
    fn add_penalties_minute_filter(&mut self, window: MinuteWindow) -> &mut Self;
    fn add_assists_minute_filter(&mut self, window: MinuteWindow) -> &mut Self;
    fn add_yellows_minute_filter(&mut self, window: MinuteWindow) -> &mut Self;
    fn add_reds_minute_filter(&mut self, window: MinuteWindow) -> &mut Self;
    fn add_minutes_played_minute_filter(&mut self, window: MinuteWindow) -> &mut Self;
}

impl PrivatePlayerMinuteFilterMethods for QueryBuilder<Postgres> {
    fn add_all_minute_filters(&mut self, window: MinuteWindow) -> &mut Self {
        self.add_appearances_minute_filter(window)
            .add_goals_minute_filter(window)
            .add_penalties_minute_filter(window)
            .add_assists_minute_filter(window)
            .add_yellows_minute_filter(window)
            .add_reds_minute_filter(window)
            .add_minutes_played_minute_filter(window)
    }

    fn add_appearances_minute_filter(&mut self, window: MinuteWindow) -> &mut Self {
        self.push(
            "
            MIN(CASE WHEN a.played_from_minute <= ",
        )
        .push_bind(window.to)
        .push(" AND (subbed_off_minute IS NULL OR subbed_off_minute > ")
        .push_bind(window.from)
        .push(
            ")
                AND played_from_minute + minutes_played >= ",
        )
        .push_bind(window.from)
        .push(" THEN 1 ELSE 0 END) AS appearances,");

        self
    }

    fn add_goals_minute_filter(&mut self, window: MinuteWindow) -> &mut Self {
        self.push(
            "
            CAST(SUM(CASE WHEN e.type = 'Goals' AND e.player_id = a.player_id AND e.minute BETWEEN ",
        )
        .push_bind(window.from)
        .push(" AND ")
        .push_bind(window.to)
        .push(" THEN 1 ELSE 0 END) AS integer) AS goals,");

        self
    }

    fn add_penalties_minute_filter(&mut self, window: MinuteWindow) -> &mut Self {
        self.push(
            "
            CAST(SUM(CASE WHEN e.type = 'Goals' AND e.player_id = a.player_id AND e.minute BETWEEN ",
        )
        .push_bind(window.from)
        .push(" AND ")
        .push_bind(window.to)
        .push(
            " AND e.is_penalty THEN 1 ELSE 0 END) AS integer) AS penalty_goals,",
        );

        self
    }

    fn add_assists_minute_filter(&mut self, window: MinuteWindow) -> &mut Self {
        self.push(
            "
            CAST(SUM(CASE WHEN e.type = 'Goals' AND e.player_assist_id = a.player_id AND e.minute BETWEEN ",
        )
        .push_bind(window.from)
        .push(" AND ")
        .push_bind(window.to)
        .push(
            " AND e.player_id != e.player_assist_id THEN 1 ELSE 0 END) AS integer) AS assists,",
        );

        self
    }

    fn add_yellows_minute_filter(&mut self, window: MinuteWindow) -> &mut Self {
        self.push(
            "
            CAST(SUM(CASE WHEN e.type = 'Cards' AND e.player_id = a.player_id AND e.minute BETWEEN ",
        )
        .push_bind(window.from)
        .push(" AND ")
        .push_bind(window.to)
        .push(
            " AND e.is_yellow THEN 1 ELSE 0 END) AS integer) AS yellow_cards,",
        );

        self
    }

    fn add_reds_minute_filter(&mut self, window: MinuteWindow) -> &mut Self {
        self.push(
            "
            CAST(SUM(CASE WHEN e.type = 'Cards' AND e.player_id = a.player_id AND e.minute BETWEEN ",
        )
        .push_bind(window.from)
        .push(" AND ")
        .push_bind(window.to)
        .push(
            " AND e.is_red THEN 1 ELSE 0 END)
                + CASE WHEN SUM(CASE WHEN e.type = 'Cards' AND e.player_id = a.player_id AND e.minute BETWEEN 0 AND ",
        )
        .push_bind(window.to)
        .push(
            " AND e.is_yellow THEN 1 ELSE 0 END) >= 2
                AND SUM(CASE WHEN e.type = 'Cards' AND e.player_id = a.player_id AND e.minute BETWEEN ",
        )
        .push_bind(window.from)
        .push(" AND ")
        .push_bind(window.to)
        .push(
            " AND e.is_yellow THEN 1 ELSE 0 END) >= 1 THEN 1 ELSE 0 END AS integer) AS red_cards,",
        );

        self
    }

    fn add_minutes_played_minute_filter(&mut self, window: MinuteWindow) -> &mut Self {
        self.push(
            "
            GREATEST(MIN(LEAST(",
        )
        .push_bind(window.to)
        .push(", subbed_off_minute, played_from_minute + minutes_played) - GREATEST(")
        .push_bind(window.from)
        .push(", played_from_minute)) + 1, 0) AS minutes_played,");

        self
    }
}

pub fn get_goals_calculation(penalties: &PenaltyOption, kind: TotalsKind) -> &'static str {
    match (kind, penalties) {
        (TotalsKind::PerGame, PenaltyOption::ExcludePenalties) => "goals - penalty_goals",
        (TotalsKind::PerGame, PenaltyOption::OnlyPenalties) => "penalty_goals",
        (TotalsKind::PerGame, _) => "goals",
        (TotalsKind::PerSeason, PenaltyOption::ExcludePenalties) => {
            "SUM(a.goals) - SUM(a.penalty_goals)"
        }
        (TotalsKind::PerSeason, PenaltyOption::OnlyPenalties) => "SUM(a.penalty_goals)",
        (TotalsKind::PerSeason, _) => "SUM(a.goals)",
    }
}
