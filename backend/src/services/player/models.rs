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
    /// Infallible by design (lenient defaults, no new 400s).
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
        let (minute_from, minute_to) = if minute_from <= minute_to {
            (minute_from, minute_to)
        } else {
            (minute_to, minute_from)
        };

        ProcessedSearchParams {
            pagination: Pagination {
                page: self.page.unwrap_or(0).max(0),
                limit: self
                    .limit
                    .unwrap_or(DEFAULT_SEARCH_LIMIT)
                    .clamp(1, MAX_SEARCH_LIMIT),
            },
            minute_window: MinuteWindow {
                from: minute_from,
                to: minute_to,
            },
            age: AgeRange {
                min: self.minimum_age.unwrap_or(0).max(0),
                max: self.maximum_age.unwrap_or(0).max(0),
            },
            height: HeightRange {
                min: self.minimum_height.unwrap_or(0).max(0),
                max: self.maximum_height.unwrap_or(0).max(0),
            },
            subs: SubFilter {
                only: self.subs_only.unwrap_or(0).max(0),
                earliest_on: self.earliest_sub_on_time.unwrap_or(0).max(0),
                latest_on: self.latest_sub_on_time.unwrap_or(0).max(0),
            },
            thresholds: StatThresholds {
                min_appearances: self.minimum_appearances.unwrap_or(0).max(0),
                min_goals: self.minimum_goals.unwrap_or(0).max(0),
                max_goals: self.maximum_goals.unwrap_or(0).max(0),
                min_assists: self.minimum_assists.unwrap_or(0).max(0),
                max_assists: self.maximum_assists.unwrap_or(0).max(0),
                min_goals_and_assists: self.minimum_goals_and_assists.unwrap_or(0).max(0),
                max_goals_and_assists: self.maximum_goals_and_assists.unwrap_or(0).max(0),
            },
            seasons: parse_csv_i32(self.seasons.as_ref()),
            competitions,
            positions,
            names: parse_csv_strings(self.names.as_ref()),
            countries,
            clubs_played_for: parse_csv_i32(self.clubs_played_for.as_ref()),
            clubs_played_against: parse_csv_i32(self.clubs_played_against.as_ref()),
            penalty: PenaltyOption::from_code(self.penalty.clone().unwrap_or_default().as_str()),
            home_or_away: HomeAwayOption::from_code(
                self.home_or_away.clone().unwrap_or_default().as_str(),
            ),
            scope: StatScope::from_code(self.scope.clone().unwrap_or_default().as_str()),
            sort: SortOption::from_code(self.sort.clone().unwrap_or_default().as_str()),
        }
    }
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProcessedSearchParams {
    pub pagination: Pagination,
    pub minute_window: MinuteWindow,
    pub age: AgeRange,
    pub height: HeightRange,
    pub subs: SubFilter,
    pub thresholds: StatThresholds,
    pub seasons: Vec<i32>,
    pub competitions: Vec<Competition>,
    pub positions: Vec<PlayerSubPosition>,
    pub names: Vec<String>,
    pub countries: Vec<Country>,
    pub clubs_played_for: Vec<i32>,
    pub clubs_played_against: Vec<i32>,
    pub penalty: PenaltyOption,
    pub home_or_away: HomeAwayOption,
    pub scope: StatScope,
    pub sort: SortOption,
}

impl ProcessedSearchParams {
    pub fn has_minute_filter(&self) -> bool {
        self.minute_window.is_filtered()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Pagination {
    pub page: i32,
    pub limit: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct MinuteWindow {
    pub from: i32,
    pub to: i32,
}

impl MinuteWindow {
    /// True when the caller narrowed the default 0-120 window,
    /// i.e. queries must aggregate from `game_events` instead of
    /// using the precomputed `appearances_enhanced` table.
    pub fn is_filtered(&self) -> bool {
        self.from != DEFAULT_MINUTE_FROM || self.to != DEFAULT_MINUTE_TO
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct AgeRange {
    pub min: i32,
    pub max: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct HeightRange {
    pub min: i32,
    pub max: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct SubFilter {
    pub only: i32,
    pub earliest_on: i32,
    pub latest_on: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct StatThresholds {
    pub min_appearances: i32,
    pub min_goals: i32,
    pub max_goals: i32,
    pub min_assists: i32,
    pub max_assists: i32,
    pub min_goals_and_assists: i32,
    pub max_goals_and_assists: i32,
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

    pub fn as_code(&self) -> &'static str {
        match self {
            Self::IncludePenalties => "ip",
            Self::ExcludePenalties => "ep",
            Self::OnlyPenalties => "op",
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

    pub fn as_code(&self) -> &'static str {
        match self {
            Self::Home => "h",
            Self::Away => "a",
            Self::Either => "e",
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

    pub fn as_code(&self) -> &'static str {
        match self {
            Self::Goals => "g",
            Self::Assists => "a",
            Self::GoalsAndAssists => "ga",
            Self::Appearances => "ap",
            Self::MinutesPlayed => "m",
            Self::YellowCards => "y",
            Self::RedCards => "r",
            Self::MinutesPerGoal => "mpg",
            Self::MinutesPerAssist => "mpa",
            Self::MinutesPerGoalOrAssist => "mpga",
            Self::MinutesPerYellow => "mpy",
            Self::MinutesPerRed => "mpr",
            Self::NumberOfGamesWith => "gw",
            Self::NumberOfSeasonsWith => "sw",
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

    pub fn as_code(&self) -> &'static str {
        match self {
            Self::Overall => "o",
            Self::Season => "s",
            Self::Game => "g",
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

        assert_eq!(result.pagination.page, 2);
        assert_eq!(result.pagination.limit, 30);
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
        assert_eq!(result.minute_window.from, 10);
        assert_eq!(result.minute_window.to, 90);
        assert!(result.has_minute_filter());
        assert_eq!(result.age.min, 18);
        assert_eq!(result.age.max, 35);
        assert_eq!(result.height.min, 160);
        assert_eq!(result.height.max, 200);
        assert_eq!(result.subs.only, 1);
        assert_eq!(result.subs.earliest_on, 20);
        assert_eq!(result.subs.latest_on, 70);
        assert_eq!(result.penalty, PenaltyOption::ExcludePenalties);
        assert_eq!(result.home_or_away, HomeAwayOption::Away);
        assert_eq!(result.scope, StatScope::Game);
        assert_eq!(result.sort, SortOption::GoalsAndAssists);
        assert_eq!(result.thresholds.min_appearances, 10);
        assert_eq!(result.thresholds.min_goals, 5);
        assert_eq!(result.thresholds.max_goals, 20);
        assert_eq!(result.thresholds.min_assists, 3);
        assert_eq!(result.thresholds.max_assists, 15);
        assert_eq!(result.thresholds.min_goals_and_assists, 8);
        assert_eq!(result.thresholds.max_goals_and_assists, 25);
    }

    #[test]
    fn test_to_processed_defaults() {
        let result = SearchParams::default().to_processed();

        assert!(result.seasons.is_empty());
        assert!(result.competitions.is_empty());
        assert!(result.positions.is_empty());
        assert!(result.names.is_empty());
        assert!(result.countries.is_empty());
        assert!(result.clubs_played_for.is_empty());
        assert!(result.clubs_played_against.is_empty());
        assert_eq!(result.pagination.page, 0);
        assert_eq!(result.pagination.limit, 50);
        assert_eq!(result.minute_window.from, 0);
        assert_eq!(result.minute_window.to, 120);
        assert!(!result.has_minute_filter());
        assert_eq!(result.age.min, 0);
        assert_eq!(result.age.max, 0);
        assert_eq!(result.height.min, 0);
        assert_eq!(result.height.max, 0);
        assert_eq!(result.subs.only, 0);
        assert_eq!(result.subs.earliest_on, 0);
        assert_eq!(result.subs.latest_on, 0);
        assert_eq!(result.penalty, PenaltyOption::IncludePenalties);
        assert_eq!(result.home_or_away, HomeAwayOption::Either);
        assert_eq!(result.scope, StatScope::Overall);
        assert_eq!(result.sort, SortOption::Goals);
        assert_eq!(result.thresholds.min_appearances, 0);
        assert_eq!(result.thresholds.min_goals, 0);
        assert_eq!(result.thresholds.max_goals, 0);
        assert_eq!(result.thresholds.min_assists, 0);
        assert_eq!(result.thresholds.max_assists, 0);
        assert_eq!(result.thresholds.min_goals_and_assists, 0);
        assert_eq!(result.thresholds.max_goals_and_assists, 0);
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
        assert!(result.minute_window.from <= result.minute_window.to);
    }

    #[test]
    fn can_process_bad_input() {
        // Plain serde_urlencoded parsing, no flatten or custom field
        // deserializers: this is the exact path actix uses for frontend
        // requests.
        let params: ProcessedSearchParams = serde_urlencoded::from_str::<SearchParams>(
            "seasons=2020,foo,2021&comps=GB1,XX&positions=LW,ZZZ&sort=unknown&minfrom=100&minto=10&penalty=ep&home=a&scope=g",
        )
        .unwrap()
        .to_processed();

        assert_eq!(params.seasons, vec![2020, 2021]);
        assert_eq!(params.competitions, vec![Competition::PremierLeague]);
        assert_eq!(params.positions, vec![PlayerSubPosition::LeftWinger]);
        assert_eq!(params.sort, SortOption::Goals);
        assert_eq!(params.penalty, PenaltyOption::ExcludePenalties);
        assert_eq!(params.home_or_away, HomeAwayOption::Away);
        assert_eq!(params.scope, StatScope::Game);
        assert!(params.has_minute_filter());
        assert!(params.minute_window.from <= params.minute_window.to);
    }
}
