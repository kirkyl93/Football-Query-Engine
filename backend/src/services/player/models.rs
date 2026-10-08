use crate::competitions::Competition;
use crate::countries::Country;
use crate::services::player::player_enums::PlayerSubPosition;
use serde::{Deserialize, Serialize};

// NOTE: toolbar params moved to `base_query_builder::ToolbarSearchParams`.
// No re-export here to keep a single canonical import path.

pub const DEFAULT_MINUTE_FROM: i32 = 0;
pub const DEFAULT_MINUTE_TO: i32 = 120;
const DEFAULT_SEARCH_LIMIT: i32 = 50;
const MAX_SEARCH_LIMIT: i32 = 100;

#[derive(Serialize, Deserialize, Default)]
pub struct SearchParams {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub seasons: Option<String>,
    #[serde(rename = "comps")]
    pub competitions: Option<String>,
    pub positions: Option<String>,
    #[serde(rename = "minfrom")]
    pub minute_played_from: Option<i32>,
    #[serde(rename = "minto")]
    pub minute_played_to: Option<i32>,
    #[serde(rename = "minage")]
    pub minimum_age: Option<i32>,
    #[serde(rename = "maxage")]
    pub maximum_age: Option<i32>,
    #[serde(rename = "minheight")]
    pub minimum_height: Option<i32>,
    #[serde(rename = "maxheight")]
    pub maximum_height: Option<i32>,
    pub names: Option<String>,
    #[serde(rename = "c")]
    pub countries: Option<String>,
    #[serde(rename = "clubspf")]
    pub clubs_played_for: Option<String>,
    #[serde(rename = "clubspa")]
    pub clubs_played_against: Option<String>,
    #[serde(rename = "subonly")]
    pub subs_only: Option<i32>,
    #[serde(rename = "earliestsub")]
    pub earliest_sub_on_time: Option<i32>,
    #[serde(rename = "latestsub")]
    pub latest_sub_on_time: Option<i32>,
    pub penalty: Option<String>,
    #[serde(rename = "home")]
    pub home_or_away: Option<String>,
    pub scope: Option<String>,
    pub sort: Option<String>,
    #[serde(rename = "ma")]
    pub minimum_appearances: Option<i32>,
    #[serde(rename = "ming")]
    pub minimum_goals: Option<i32>,
    #[serde(rename = "maxg")]
    pub maximum_goals: Option<i32>,
    #[serde(rename = "mina")]
    pub minimum_assists: Option<i32>,
    #[serde(rename = "maxa")]
    pub maximum_assists: Option<i32>,
    #[serde(rename = "minga")]
    pub minimum_goals_and_assists: Option<i32>,
    #[serde(rename = "maxga")]
    pub maximum_goals_and_assists: Option<i32>,
}

/// Lenient CSV parsing: unparseable tokens are ignored (documented).
fn parse_csv_i32(raw: Option<&String>) -> Vec<i32> {
    raw.map(|s| {
        s.split(',')
            .filter_map(|part| part.trim().parse::<i32>().ok())
            .collect()
    })
    .unwrap_or_default()
}

fn parse_csv_strings(raw: Option<&String>) -> Vec<String> {
    raw.map(|s| {
        s.split(',')
            .map(|part| part.trim().to_string())
            .filter(|part| !part.is_empty())
            .collect()
    })
    .unwrap_or_default()
}

impl SearchParams {
    /// Infallible by design (see plan: keep lenient defaults, no new 400s).
    /// Unknown codes fall back to defaults; bad numbers are skipped.
    pub fn to_processed(&self) -> ProcessedSearchParams {
        let competitions: Vec<Competition> = self
            .competitions
            .as_ref()
            .map(|c| {
                c.split(',')
                    .map(|code| Competition::from_code(code.trim()))
                    .filter(|c| *c != Competition::Missing)
                    .collect()
            })
            .unwrap_or_default();

        let positions: Vec<PlayerSubPosition> = self
            .positions
            .as_ref()
            .map(|p| {
                p.split(',')
                    .map(|code| PlayerSubPosition::from_code(code.trim()))
                    .filter(|pos| *pos != PlayerSubPosition::Missing)
                    .collect()
            })
            .unwrap_or_default();

        let countries: Vec<Country> = self
            .countries
            .as_ref()
            .map(|p| {
                p.split(',')
                    .map(|code| Country::from_code(code.trim()))
                    .filter(|c| *c != Country::Missing)
                    .collect()
            })
            .unwrap_or_default();

        let minute_from = self
            .minute_played_from
            .unwrap_or(DEFAULT_MINUTE_FROM)
            .clamp(DEFAULT_MINUTE_FROM, DEFAULT_MINUTE_TO);
        let minute_to = self
            .minute_played_to
            .unwrap_or(DEFAULT_MINUTE_TO)
            .clamp(DEFAULT_MINUTE_FROM, DEFAULT_MINUTE_TO);
        let (minute_played_from, minute_played_to) = if minute_from <= minute_to {
            (minute_from, minute_to)
        } else {
            (minute_to, minute_from)
        };

        ProcessedSearchParams {
            page: self.page.unwrap_or(0).max(0),
            limit: self
                .limit
                .unwrap_or(DEFAULT_SEARCH_LIMIT)
                .clamp(1, MAX_SEARCH_LIMIT),
            seasons: parse_csv_i32(self.seasons.as_ref()),
            competitions,
            positions,
            minute_played_from,
            minute_played_to,
            minimum_age: self.minimum_age.unwrap_or(0).max(0),
            maximum_age: self.maximum_age.unwrap_or(0).max(0),
            minimum_height: self.minimum_height.unwrap_or(0).max(0),
            maximum_height: self.maximum_height.unwrap_or(0).max(0),
            names: parse_csv_strings(self.names.as_ref()),
            countries,
            clubs_played_for: parse_csv_i32(self.clubs_played_for.as_ref()),
            clubs_played_against: parse_csv_i32(self.clubs_played_against.as_ref()),
            subs_only: self.subs_only.unwrap_or(0).max(0),
            earliest_sub_on_time: self.earliest_sub_on_time.unwrap_or(0).max(0),
            latest_sub_on_time: self.latest_sub_on_time.unwrap_or(0).max(0),
            penalties: PenaltyOption::from_code(self.penalty.clone().unwrap_or_default().as_str()),
            home_or_away: HomeAwayOption::from_code(
                self.home_or_away.clone().unwrap_or_default().as_str(),
            ),
            scope: StatScope::from_code(self.scope.clone().unwrap_or_default().as_str()),
            sort: SortOption::from_code(self.sort.clone().unwrap_or_default().as_str()),
            minimum_appearances: self.minimum_appearances.unwrap_or(0).max(0),
            minimum_goals: self.minimum_goals.unwrap_or(0).max(0),
            maximum_goals: self.maximum_goals.unwrap_or(0).max(0),
            minimum_assists: self.minimum_assists.unwrap_or(0).max(0),
            maximum_assists: self.maximum_assists.unwrap_or(0).max(0),
            minimum_goals_and_assists: self.minimum_goals_and_assists.unwrap_or(0).max(0),
            maximum_goals_and_assists: self.maximum_goals_and_assists.unwrap_or(0).max(0),
        }
    }
}

pub struct ProcessedSearchParams {
    page: i32,
    limit: i32,
    seasons: Vec<i32>,
    competitions: Vec<Competition>,
    positions: Vec<PlayerSubPosition>,
    minute_played_from: i32,
    minute_played_to: i32,
    minimum_age: i32,
    maximum_age: i32,
    minimum_height: i32,
    maximum_height: i32,
    names: Vec<String>,
    countries: Vec<Country>,
    clubs_played_for: Vec<i32>,
    clubs_played_against: Vec<i32>,
    subs_only: i32,
    earliest_sub_on_time: i32,
    latest_sub_on_time: i32,
    penalties: PenaltyOption,
    home_or_away: HomeAwayOption,
    scope: StatScope,
    sort: SortOption,
    minimum_appearances: i32,
    minimum_goals: i32,
    maximum_goals: i32,
    minimum_assists: i32,
    maximum_assists: i32,
    minimum_goals_and_assists: i32,
    maximum_goals_and_assists: i32,
}

impl ProcessedSearchParams {
    pub fn page(&self) -> i32 {
        self.page
    }

    pub fn limit(&self) -> i32 {
        self.limit
    }

    pub fn seasons(&self) -> &[i32] {
        &self.seasons
    }

    pub fn competitions(&self) -> &[Competition] {
        &self.competitions
    }

    pub fn positions(&self) -> &[PlayerSubPosition] {
        &self.positions
    }

    pub fn minute_played_from(&self) -> i32 {
        self.minute_played_from
    }

    pub fn minute_played_to(&self) -> i32 {
        self.minute_played_to
    }

    /// True when the caller narrowed the default 0-120 window,
    /// i.e. queries must aggregate from `game_events` instead of
    /// using the precomputed `appearances_enhanced` table.
    pub fn has_minute_filter(&self) -> bool {
        self.minute_played_from != DEFAULT_MINUTE_FROM || self.minute_played_to != DEFAULT_MINUTE_TO
    }

    pub fn minimum_age(&self) -> i32 {
        self.minimum_age
    }

    pub fn maximum_age(&self) -> i32 {
        self.maximum_age
    }

    pub fn minimum_height(&self) -> i32 {
        self.minimum_height
    }

    pub fn maximum_height(&self) -> i32 {
        self.maximum_height
    }

    pub fn names(&self) -> &[String] {
        &self.names
    }

    pub fn countries(&self) -> &[Country] {
        &self.countries
    }

    pub fn clubs_played_for(&self) -> &[i32] {
        &self.clubs_played_for
    }

    pub fn clubs_played_against(&self) -> &[i32] {
        &self.clubs_played_against
    }

    pub fn subs_only(&self) -> i32 {
        self.subs_only
    }

    pub fn earliest_sub_on_time(&self) -> i32 {
        self.earliest_sub_on_time
    }

    pub fn latest_sub_on_time(&self) -> i32 {
        self.latest_sub_on_time
    }

    pub fn penalties(&self) -> &PenaltyOption {
        &self.penalties
    }

    pub fn home_or_away(&self) -> &HomeAwayOption {
        &self.home_or_away
    }

    pub fn scope(&self) -> &StatScope {
        &self.scope
    }

    pub fn sort(&self) -> &SortOption {
        &self.sort
    }

    pub fn minimum_appearances(&self) -> i32 {
        self.minimum_appearances
    }

    pub fn minimum_goals(&self) -> i32 {
        self.minimum_goals
    }

    pub fn maximum_goals(&self) -> i32 {
        self.maximum_goals
    }

    pub fn minimum_assists(&self) -> i32 {
        self.minimum_assists
    }

    pub fn maximum_assists(&self) -> i32 {
        self.maximum_assists
    }

    pub fn minimum_goals_and_assists(&self) -> i32 {
        self.minimum_goals_and_assists
    }

    pub fn maximum_goals_and_assists(&self) -> i32 {
        self.maximum_goals_and_assists
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PenaltyOption {
    IncludePenalties,
    ExcludePenalties,
    OnlyPenalties,
}

impl PenaltyOption {
    pub fn from_code(value: &str) -> Self {
        match value.trim() {
            "ep" => Self::ExcludePenalties,
            "op" => Self::OnlyPenalties,
            _ => Self::IncludePenalties,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HomeAwayOption {
    Home,
    Away,
    Either,
}

impl HomeAwayOption {
    pub fn from_code(value: &str) -> Self {
        match value.trim() {
            "h" => Self::Home,
            "a" => Self::Away,
            _ => Self::Either,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SortOption {
    Goals,
    Assists,
    GoalsAndAssists,
    Appearances,
    MinutesPlayed,
    YellowCards,
    RedCards,
    MinutesPerGoal,
    MinutesPerAssist,
    MinutesPerGoalOrAssist,
    MinutesPerYellow,
    MinutesPerRed,
    NumberOfGamesWith,
    NumberOfSeasonsWith,
}

impl SortOption {
    pub fn from_code(value: &str) -> Self {
        match value.trim() {
            "a" => Self::Assists,
            "ga" => Self::GoalsAndAssists,
            "ap" => Self::Appearances,
            "m" => Self::MinutesPlayed,
            "y" => Self::YellowCards,
            "r" => Self::RedCards,
            "mpg" => Self::MinutesPerGoal,
            "mpa" => Self::MinutesPerAssist,
            "mpga" => Self::MinutesPerGoalOrAssist,
            "mpy" => Self::MinutesPerYellow,
            "mpr" => Self::MinutesPerRed,
            "gw" => Self::NumberOfGamesWith,
            "sw" => Self::NumberOfSeasonsWith,
            _ => Self::Goals,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StatScope {
    Overall,
    Season,
    Game,
}

impl StatScope {
    pub fn from_code(value: &str) -> Self {
        match value.trim() {
            "s" => Self::Season,
            "g" => Self::Game,
            _ => Self::Overall,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::competitions::Competition;
    use crate::services::player::player_enums::PlayerSubPosition;

    #[test]
    fn test_to_processed() {
        let params = SearchParams {
            seasons: Some("2020,2021".to_string()),
            competitions: Some("GB1,CL".to_string()),
            positions: Some("LW,CB".to_string()),
            names: Some("Messi,Ronaldo".to_string()),
            countries: Some("ar,pl".to_string()),
            clubs_played_for: Some("1,2".to_string()),
            clubs_played_against: Some("3,4".to_string()),
            page: Some(2),
            limit: Some(30),
            minute_played_from: Some(10),
            minute_played_to: Some(90),
            minimum_age: Some(18),
            maximum_age: Some(35),
            minimum_height: Some(160),
            maximum_height: Some(200),
            subs_only: Some(1),
            earliest_sub_on_time: Some(20),
            latest_sub_on_time: Some(70),
            penalty: Some("ep".to_string()),
            home_or_away: Some("a".to_string()),
            scope: Some("g".to_string()),
            sort: Some("ga".to_string()),
            minimum_appearances: Some(10),
            minimum_goals: Some(5),
            maximum_goals: Some(20),
            minimum_assists: Some(3),
            maximum_assists: Some(15),
            minimum_goals_and_assists: Some(8),
            maximum_goals_and_assists: Some(25),
        };

        let result = params.to_processed();

        // Assertions
        assert_eq!(result.page, 2);
        assert_eq!(result.limit, 30);
        assert_eq!(result.seasons, vec![2020, 2021]);
        assert_eq!(
            result.competitions,
            vec![Competition::PremierLeague, Competition::ChampionsLeague]
        );
        assert_eq!(
            result.positions,
            vec![PlayerSubPosition::LeftWinger, PlayerSubPosition::CentreBack]
        );
        assert_eq!(result.names, vec!["Messi", "Ronaldo"]);
        assert_eq!(result.countries, vec![Country::Argentina, Country::Poland]);
        assert_eq!(result.clubs_played_for, vec![1, 2]);
        assert_eq!(result.clubs_played_against, vec![3, 4]);
        assert_eq!(result.minute_played_from, 10);
        assert_eq!(result.minute_played_to, 90);
        assert_eq!(result.minimum_age, 18);
        assert_eq!(result.maximum_age, 35);
        assert_eq!(result.minimum_height, 160);
        assert_eq!(result.maximum_height, 200);
        assert_eq!(result.subs_only, 1);
        assert_eq!(result.earliest_sub_on_time, 20);
        assert_eq!(result.latest_sub_on_time, 70);
        assert_eq!(result.penalties, PenaltyOption::ExcludePenalties);
        assert_eq!(result.home_or_away, HomeAwayOption::Away);
        assert_eq!(result.scope, StatScope::Game);
        assert_eq!(result.sort, SortOption::GoalsAndAssists);
        assert_eq!(result.minimum_appearances, 10);
        assert_eq!(result.minimum_goals, 5);
        assert_eq!(result.maximum_goals, 20);
        assert_eq!(result.minimum_assists, 3);
        assert_eq!(result.maximum_assists, 15);
        assert_eq!(result.minimum_goals_and_assists, 8);
        assert_eq!(result.maximum_goals_and_assists, 25);
    }

    #[test]
    fn test_to_processed_defaults() {
        let params = SearchParams::default();

        let result = params.to_processed();

        // Assertions for defaults
        assert_eq!(result.seasons, Vec::<i32>::new());
        assert_eq!(result.competitions, Vec::<Competition>::new());
        assert_eq!(result.positions, Vec::<PlayerSubPosition>::new());
        assert_eq!(result.names, Vec::<String>::new());
        assert_eq!(result.countries, Vec::<Country>::new());
        assert_eq!(result.clubs_played_for, Vec::<i32>::new());
        assert_eq!(result.clubs_played_against, Vec::<i32>::new());
        assert_eq!(result.page, 0);
        assert_eq!(result.limit, 50);
        assert_eq!(result.minute_played_from, 0);
        assert_eq!(result.minute_played_to, 120);
        assert_eq!(result.minimum_age, 0);
        assert_eq!(result.maximum_age, 0);
        assert_eq!(result.minimum_height, 0);
        assert_eq!(result.maximum_height, 0);
        assert_eq!(result.subs_only, 0);
        assert_eq!(result.earliest_sub_on_time, 0);
        assert_eq!(result.latest_sub_on_time, 0);
        assert_eq!(result.penalties, PenaltyOption::IncludePenalties);
        assert_eq!(result.home_or_away, HomeAwayOption::Either);
        assert_eq!(result.scope, StatScope::Overall);
        assert_eq!(result.sort, SortOption::Goals);
        assert_eq!(result.minimum_appearances, 0);
        assert_eq!(result.minimum_goals, 0);
        assert_eq!(result.maximum_goals, 0);
        assert_eq!(result.minimum_assists, 0);
        assert_eq!(result.maximum_assists, 0);
        assert_eq!(result.minimum_goals_and_assists, 0);
        assert_eq!(result.maximum_goals_and_assists, 0);
    }

    #[test]
    fn lenient_parsing_ignores_bad_tokens() {
        let params = SearchParams {
            seasons: Some("2020,foo,2021,".to_string()),
            sort: Some("unknown".to_string()),
            minute_played_from: Some(100),
            minute_played_to: Some(10),
            ..Default::default()
        };

        let result = params.to_processed();
        assert_eq!(result.seasons, vec![2020, 2021]);
        assert_eq!(result.sort, SortOption::Goals);
        assert!(result.has_minute_filter());
        assert!(result.minute_played_from <= result.minute_played_to);
    }
}
