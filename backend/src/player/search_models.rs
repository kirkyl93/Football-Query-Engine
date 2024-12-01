use serde::{Deserialize, Serialize};
use crate::player::player_enums::map_sub_position_code_to_position;
#[derive(Deserialize)]
pub struct ToolbarSearchParams {
    page: Option<i32>,
    limit: Option<i32>,
    search_name: Option<String>,
}

impl ToolbarSearchParams {
    pub fn page(&self) -> Option<i32> {
        self.page
    }

    pub fn limit(&self) -> Option<i32> {
        self.limit
    }

    pub fn search_name(&self) -> &Option<String> {
        &self.search_name
    }
}

#[derive(Serialize, Deserialize)]
pub struct SearchParams {
    page: Option<i32>,
    limit: Option<i32>,
    seasons: Option<String>,
    #[serde(rename = "comps")]
    competitions: Option<String>,
    positions: Option<String>,
    #[serde(rename = "minfrom")]
    minute_played_from: Option<i32>,
    #[serde(rename = "minto")]
    minute_played_to: Option<i32>,
    #[serde(rename = "minage")]
    minimum_age: Option<i32>,
    #[serde(rename = "maxage")]
    maximum_age: Option<i32>,
    #[serde(rename = "minheight")]
    minimum_height: Option<i32>,
    #[serde(rename = "maxheight")]
    maximum_height: Option<i32>,
    names: Option<String>,
    #[serde(rename = "clubspf")]
    clubs_played_for: Option<String>,
    #[serde(rename = "clubspa")]
    clubs_played_against: Option<String>,
    #[serde(rename = "subonly")]
    subs_only: Option<i32>,
    #[serde(rename = "earliestsub")]
    earliest_sub_on_time: Option<i32>,
    #[serde(rename = "latestsub")]
    latest_sub_on_time: Option<i32>,
    penalty: Option<String>,
    #[serde(rename = "home")]
    home_or_away: Option<String>,
    scope: Option<String>,
    sort: Option<String>,
    #[serde(rename = "ma")]
    minimum_appearances: Option<i32>,
    #[serde(rename = "ming")]
    minimum_goals: Option<i32>,
    #[serde(rename = "maxg")]
    maximum_goals: Option<i32>,
    #[serde(rename = "mina")]
    minimum_assists: Option<i32>,
    #[serde(rename = "maxa")]
    maximum_assists: Option<i32>
}

impl SearchParams {
    pub fn to_processed(&self) -> Result<ProcessedSearchParams, String> {
        let seasons: Vec<i32> = self.seasons
            .as_ref()
            .map(|s| s.split(',').filter_map(|s| s.parse().ok()).collect())
            .unwrap_or_else(Vec::new);

        let competitions: Vec<String> = self.competitions
            .as_ref()
            .map(|c| c.split(',').map(String::from).collect())
            .unwrap_or_else(Vec::new);

        let positions: Vec<String> = self.positions
            .as_ref()
            .map(|p| p.split(',').map(|s| map_sub_position_code_to_position(s)).map(String::from).collect())
            .unwrap_or_else(Vec::new);

        let names: Vec<String> = self.names
            .as_ref()
            .map(|p| p.split(',').map(String::from).collect())
            .unwrap_or_else(Vec::new);

        let clubs_played_for: Vec<i32> = self.clubs_played_for
            .as_ref()
            .map(|s| s.split(',').filter_map(|s| s.parse().ok()).collect())
            .unwrap_or_else(Vec::new);

        let clubs_played_against: Vec<i32> = self.clubs_played_against
            .as_ref()
            .map(|s| s.split(',').filter_map(|s| s.parse().ok()).collect())
            .unwrap_or_else(Vec::new);

        Ok(ProcessedSearchParams {
            page: self.page.unwrap_or(0),
            limit: self.limit.unwrap_or(50).min(100),
            seasons,
            competitions,
            positions,
            minute_played_from: self.minute_played_from.unwrap_or(0).min(120),
            minute_played_to: self.minute_played_to.unwrap_or(120).max(0),
            minimum_age: self.minimum_age.unwrap_or(0),
            maximum_age: self.maximum_age.unwrap_or(0),
            minimum_height: self.minimum_height.unwrap_or(0),
            maximum_height: self.maximum_height.unwrap_or(0),
            names,
            clubs_played_for,
            clubs_played_against,
            subs_only: self.subs_only.unwrap_or(0),
            earliest_sub_on_time: self.earliest_sub_on_time.unwrap_or(0),
            latest_sub_on_time: self.latest_sub_on_time.unwrap_or(0),
            penalties: PenaltyOption::from_str(self.penalty.clone().unwrap_or_default().as_str()).unwrap(),
            home_or_away: HomeAwayOption::from_str(self.home_or_away.clone().unwrap_or_default().as_str()).unwrap(),
            scope: StatScope::from_str(self.scope.clone().unwrap_or_default().as_str()).unwrap(),
            sort: SortOption::from_str(self.sort.clone().unwrap_or_default().as_str()).unwrap(),
            minimum_appearances: self.minimum_appearances.unwrap_or(0),
            minimum_goals: self.minimum_goals.unwrap_or(0),
            maximum_goals: self.maximum_goals.unwrap_or(0),
            minimum_assists: self.minimum_assists.unwrap_or(0),
            maximum_assists: self.maximum_assists.unwrap_or(0)
        })
    }
}

pub struct ProcessedSearchParams {
    page: i32,
    limit: i32,
    seasons: Vec<i32>,
    competitions: Vec<String>,
    positions: Vec<String>,
    minute_played_from: i32,
    minute_played_to: i32,
    minimum_age: i32,
    maximum_age: i32,
    minimum_height: i32,
    maximum_height: i32,
    names: Vec<String>,
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
    maximum_assists: i32
}

impl ProcessedSearchParams {
    pub fn page(&self) -> i32 {
        self.page
    }

    pub fn limit(&self) -> i32 {
        self.limit
    }

    pub fn seasons(&self) -> &Vec<i32> {
        &self.seasons
    }

    pub fn competitions(&self) -> &Vec<String> {
        &self.competitions
    }

    pub fn positions(&self) -> &Vec<String> {
        &self.positions
    }

    pub fn minute_played_from(&self) -> i32 {
        self.minute_played_from
    }

    pub fn minute_played_to(&self) -> i32 {
        self.minute_played_to
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

    pub fn names(&self) -> &Vec<String> {
        &self.names
    }

    pub fn clubs_played_for(&self) -> &Vec<i32> {
        &self.clubs_played_for
    }

    pub fn clubs_played_against(&self) -> &Vec<i32> {
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
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PenaltyOption {
    IncludePenalties,
    ExcludePenalties,
    OnlyPenalties,
}

impl PenaltyOption {
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "ip" => Some(Self::IncludePenalties),
            "ep" => Some(Self::ExcludePenalties),
            "op" => Some(Self::OnlyPenalties),
            _ => Some(Self::IncludePenalties)
        }
    }

    pub fn as_str(&self) -> &'static str {
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
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "h" => Some(Self::Home),
            "a" => Some(Self::Away),
            "e" => Some(Self::Either),
            _ => Some(Self::Either)
        }
    }

    pub fn as_str(&self) -> &'static str {
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
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "g" => Some(Self::Goals),
            "a" => Some(Self::Assists),
            "ga" => Some(Self::GoalsAndAssists),
            "ap" => Some(Self::Appearances),
            "m" => Some(Self::MinutesPlayed),
            "y" => Some(Self::YellowCards),
            "r" => Some(Self::RedCards),
            "mpg" => Some(Self::MinutesPerGoal),
            "mpa" => Some(Self::MinutesPerAssist),
            "mpga" => Some(Self::MinutesPerGoalOrAssist),
            "mpy" => Some(Self::MinutesPerYellow),
            "mpr" => Some(Self::MinutesPerRed),
            "gw" => Some(Self::NumberOfGamesWith),
            "sw" => Some(Self::NumberOfSeasonsWith),
            _ => Some(Self::Goals),
        }
    }

    pub fn as_str(&self) -> &'static str {
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
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "o" => Some(Self::Overall),
            "s" => Some(Self::Season),
            "g" => Some(Self::Game),
            _ => Some(Self::Overall)
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Overall => "o",
            Self::Season => "s",
            Self::Game => "g",
        }
    }
}
