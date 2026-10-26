//! Fluent test queries, serialized through the real HTTP parameter model.
#![allow(dead_code)] // Each integration binary uses a different subset of filters.
use football_game::competitions::Competition;
use football_game::countries::Country;
use football_game::services::player::models::{
    HomeAwayOption, PenaltyOption, SearchParams, SortOption, StatScope,
};
use football_game::services::player::player_enums::PlayerSubPosition;
#[derive(Default)]
pub struct SearchParamsBuilder {
    params: SearchParams,
}

impl SearchParamsBuilder {
    pub fn new() -> Self {
        Self {
            params: SearchParams::default(),
        }
    }

    pub fn page(mut self, page: i32) -> Self {
        self.params.page = Some(page);
        self
    }

    pub fn limit(mut self, limit: i32) -> Self {
        self.params.limit = Some(limit);
        self
    }

    pub fn seasons(mut self, seasons: Vec<i32>) -> Self {
        self.params.seasons = Some(
            seasons
                .iter()
                .map(|&season| season.to_string())
                .collect::<Vec<String>>()
                .join(","),
        );
        self
    }

    pub fn competitions(mut self, competitions: Vec<Competition>) -> Self {
        let competition_codes: Vec<&str> = competitions
            .iter()
            .map(Competition::competition_code)
            .collect();

        self.params.competitions = Some(competition_codes.join(","));
        self
    }

    pub fn positions(mut self, positions: Vec<PlayerSubPosition>) -> Self {
        let position_codes: Vec<&str> = positions.iter().map(get_code_from_sub_position).collect();
        self.params.positions = Some(position_codes.join(","));
        self
    }

    pub fn minute_played_from(mut self, minutes_from: i32) -> Self {
        self.params.minute_played_from = Some(minutes_from);
        self
    }

    pub fn minute_played_to(mut self, minutes_to: i32) -> Self {
        self.params.minute_played_to = Some(minutes_to);
        self
    }

    pub fn minimum_age(mut self, minimum_age: i32) -> Self {
        self.params.minimum_age = Some(minimum_age);
        self
    }

    pub fn maximum_age(mut self, maximum_age: i32) -> Self {
        self.params.maximum_age = Some(maximum_age);
        self
    }

    pub fn minimum_height(mut self, minimum_height: i32) -> Self {
        self.params.minimum_height = Some(minimum_height);
        self
    }

    pub fn maximum_height(mut self, maximum_height: i32) -> Self {
        self.params.maximum_height = Some(maximum_height);
        self
    }

    pub fn names(mut self, names: Vec<&str>) -> Self {
        self.params.names = Some(names.join(","));
        self
    }

    pub fn countries(mut self, countries: Vec<Country>) -> Self {
        let country_codes: Vec<&str> = countries.iter().map(Country::code).collect();
        self.params.countries = Some(country_codes.join(","));
        self
    }

    pub fn clubs_played_for(mut self, clubs_played_for: Vec<&str>) -> Self {
        self.params.clubs_played_for = Some(clubs_played_for.join(","));
        self
    }

    pub fn clubs_played_against(mut self, clubs_played_against: &str) -> Self {
        self.params.clubs_played_against = Some(clubs_played_against.to_string());
        self
    }

    pub fn subs_only(mut self, subs_only: bool) -> Self {
        if subs_only {
            self.params.subs_only = Some(1);
        }
        self
    }

    pub fn earliest_sub_on_time(mut self, earliest_sub_on_time: i32) -> Self {
        self.params.earliest_sub_on_time = Some(earliest_sub_on_time);
        self
    }

    pub fn latest_sub_on_time(mut self, latest_sub_on_time: i32) -> Self {
        self.params.latest_sub_on_time = Some(latest_sub_on_time);
        self
    }

    pub fn penalty(mut self, penalty: PenaltyOption) -> Self {
        self.params.penalty = Some(penalty.as_code().to_string());
        self
    }

    pub fn home_or_away(mut self, home_or_away: HomeAwayOption) -> Self {
        self.params.home_or_away = Some(home_or_away.as_code().to_string());
        self
    }

    pub fn scope(mut self, scope: StatScope) -> Self {
        self.params.scope = Some(scope.as_code().to_string());
        self
    }

    pub fn sort(mut self, sort: SortOption) -> Self {
        self.params.sort = Some(sort.as_code().to_string());
        self
    }

    pub fn minimum_appearances(mut self, minimum_appearances: i32) -> Self {
        self.params.minimum_appearances = Some(minimum_appearances);
        self
    }

    pub fn minimum_goals(mut self, minimum_goals: i32) -> Self {
        self.params.minimum_goals = Some(minimum_goals);
        self
    }

    pub fn maximum_goals(mut self, maximum_goals: i32) -> Self {
        self.params.maximum_goals = Some(maximum_goals);
        self
    }

    pub fn minimum_assists(mut self, minimum_assists: i32) -> Self {
        self.params.minimum_assists = Some(minimum_assists);
        self
    }

    pub fn maximum_assists(mut self, maximum_assists: i32) -> Self {
        self.params.maximum_assists = Some(maximum_assists);
        self
    }

    pub fn minimum_goals_and_assists(mut self, minimum_goals_and_assists: i32) -> Self {
        self.params.minimum_goals_and_assists = Some(minimum_goals_and_assists);
        self
    }

    pub fn maximum_goals_and_assists(mut self, maximum_goals_and_assists: i32) -> Self {
        self.params.maximum_goals_and_assists = Some(maximum_goals_and_assists);
        self
    }

    pub fn build(self) -> SearchParams {
        self.params
    }

    pub fn build_query(&self) -> String {
        serde_urlencoded::to_string(&self.params).unwrap()
    }
}

pub fn get_code_from_sub_position(sub_position: &PlayerSubPosition) -> &'static str {
    match sub_position {
        PlayerSubPosition::Goalkeeper => "GK",
        PlayerSubPosition::LeftBack => "LB",
        PlayerSubPosition::CentreBack => "CB",
        PlayerSubPosition::RightBack => "RB",
        PlayerSubPosition::DefensiveMidfield => "CDM",
        PlayerSubPosition::LeftMidfield => "LM",
        PlayerSubPosition::CentralMidfield => "CM",
        PlayerSubPosition::RightMidfield => "RM",
        PlayerSubPosition::LeftWinger => "LW",
        PlayerSubPosition::RightWinger => "RW",
        PlayerSubPosition::AttackingMidfield => "CAM",
        PlayerSubPosition::SecondStriker => "SS",
        PlayerSubPosition::CentreForward => "CF",
        PlayerSubPosition::Missing => "",
    }
}

impl Clone for SearchParamsBuilder {
    fn clone(&self) -> Self {
        Self {
            params: SearchParams {
                page: self.params.page,
                limit: self.params.limit,
                seasons: self.params.seasons.clone(),
                competitions: self.params.competitions.clone(),
                positions: self.params.positions.clone(),
                minute_played_from: self.params.minute_played_from,
                minute_played_to: self.params.minute_played_to,
                minimum_age: self.params.minimum_age,
                maximum_age: self.params.maximum_age,
                minimum_height: self.params.minimum_height,
                maximum_height: self.params.maximum_height,
                names: self.params.names.clone(),
                countries: self.params.countries.clone(),
                clubs_played_for: self.params.clubs_played_for.clone(),
                clubs_played_against: self.params.clubs_played_against.clone(),
                subs_only: self.params.subs_only,
                earliest_sub_on_time: self.params.earliest_sub_on_time,
                latest_sub_on_time: self.params.latest_sub_on_time,
                penalty: self.params.penalty.clone(),
                home_or_away: self.params.home_or_away.clone(),
                scope: self.params.scope.clone(),
                sort: self.params.sort.clone(),
                minimum_appearances: self.params.minimum_appearances,
                minimum_goals: self.params.minimum_goals,
                maximum_goals: self.params.maximum_goals,
                minimum_assists: self.params.minimum_assists,
                maximum_assists: self.params.maximum_assists,
                minimum_goals_and_assists: self.params.minimum_goals_and_assists,
                maximum_goals_and_assists: self.params.maximum_goals_and_assists,
            },
        }
    }
}

impl SearchParamsBuilder {
    /// Reuse a named filter set in a parameterized case; only explicitly set fields override.
    pub fn with_filters(mut self, filters: &Self) -> Self {
        if filters.params.page.is_some() {
            self.params.page = filters.params.page;
        }
        if filters.params.limit.is_some() {
            self.params.limit = filters.params.limit;
        }
        if filters.params.seasons.is_some() {
            self.params.seasons = filters.params.seasons.clone();
        }
        if filters.params.competitions.is_some() {
            self.params.competitions = filters.params.competitions.clone();
        }
        if filters.params.positions.is_some() {
            self.params.positions = filters.params.positions.clone();
        }
        if filters.params.minute_played_from.is_some() {
            self.params.minute_played_from = filters.params.minute_played_from;
        }
        if filters.params.minute_played_to.is_some() {
            self.params.minute_played_to = filters.params.minute_played_to;
        }
        if filters.params.minimum_age.is_some() {
            self.params.minimum_age = filters.params.minimum_age;
        }
        if filters.params.maximum_age.is_some() {
            self.params.maximum_age = filters.params.maximum_age;
        }
        if filters.params.minimum_height.is_some() {
            self.params.minimum_height = filters.params.minimum_height;
        }
        if filters.params.maximum_height.is_some() {
            self.params.maximum_height = filters.params.maximum_height;
        }
        if filters.params.names.is_some() {
            self.params.names = filters.params.names.clone();
        }
        if filters.params.countries.is_some() {
            self.params.countries = filters.params.countries.clone();
        }
        if filters.params.clubs_played_for.is_some() {
            self.params.clubs_played_for = filters.params.clubs_played_for.clone();
        }
        if filters.params.clubs_played_against.is_some() {
            self.params.clubs_played_against = filters.params.clubs_played_against.clone();
        }
        if filters.params.subs_only.is_some() {
            self.params.subs_only = filters.params.subs_only;
        }
        if filters.params.earliest_sub_on_time.is_some() {
            self.params.earliest_sub_on_time = filters.params.earliest_sub_on_time;
        }
        if filters.params.latest_sub_on_time.is_some() {
            self.params.latest_sub_on_time = filters.params.latest_sub_on_time;
        }
        if filters.params.penalty.is_some() {
            self.params.penalty = filters.params.penalty.clone();
        }
        if filters.params.home_or_away.is_some() {
            self.params.home_or_away = filters.params.home_or_away.clone();
        }
        if filters.params.scope.is_some() {
            self.params.scope = filters.params.scope.clone();
        }
        if filters.params.sort.is_some() {
            self.params.sort = filters.params.sort.clone();
        }
        if filters.params.minimum_appearances.is_some() {
            self.params.minimum_appearances = filters.params.minimum_appearances;
        }
        if filters.params.minimum_goals.is_some() {
            self.params.minimum_goals = filters.params.minimum_goals;
        }
        if filters.params.maximum_goals.is_some() {
            self.params.maximum_goals = filters.params.maximum_goals;
        }
        if filters.params.minimum_assists.is_some() {
            self.params.minimum_assists = filters.params.minimum_assists;
        }
        if filters.params.maximum_assists.is_some() {
            self.params.maximum_assists = filters.params.maximum_assists;
        }
        if filters.params.minimum_goals_and_assists.is_some() {
            self.params.minimum_goals_and_assists = filters.params.minimum_goals_and_assists;
        }
        if filters.params.maximum_goals_and_assists.is_some() {
            self.params.maximum_goals_and_assists = filters.params.maximum_goals_and_assists;
        }
        self
    }
}

impl std::fmt::Display for SearchParamsBuilder {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.build_query())
    }
}
