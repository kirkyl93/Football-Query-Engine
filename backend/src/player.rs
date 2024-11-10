use chrono::{NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Error, FromRow, Row};
use sqlx::postgres::PgRow;

use crate::countries::Country;
use crate::competitions::Competition;
use crate::competitions::CompetitionType;

#[derive(Copy, Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum PlayerSubPosition {
    #[serde(rename = "GK")]
    Goalkeeper,
    #[serde(rename = "LB")]
    LeftBack,
    #[serde(rename = "CB")]
    CentreBack,
    #[serde(rename = "RB")]
    RightBack,
    #[serde(rename = "CDM")]
    DefensiveMidfield,
    #[serde(rename = "LM")]
    LeftMidfield,
    #[serde(rename = "CM")]
    CentralMidfield,
    #[serde(rename = "RM")]
    RightMidfield,
    #[serde(rename = "LW")]
    LeftWinger,
    #[serde(rename = "RW")]
    RightWinger,
    #[serde(rename = "CAM")]
    AttackingMidfield,
    #[serde(rename = "SS")]
    SecondStriker,
    #[serde(rename = "CF")]
    CentreForward,
    Missing,
}

impl PlayerSubPosition {
    fn from_str(s: &str) -> Self {
        match s {
            "Goalkeeper" => PlayerSubPosition::Goalkeeper,
            "Left-Back" => PlayerSubPosition::LeftBack,
            "Centre-Back" => PlayerSubPosition::CentreBack,
            "Right-Back" => PlayerSubPosition::RightBack,
            "Defensive Midfield" => PlayerSubPosition::DefensiveMidfield,
            "Left Midfield" => PlayerSubPosition::LeftMidfield,
            "Central Midfield" => PlayerSubPosition::CentralMidfield,
            "Right Midfield" => PlayerSubPosition::RightMidfield,
            "Left Winger" => PlayerSubPosition::LeftWinger,
            "Right Winger" => PlayerSubPosition::RightWinger,
            "Attacking Midfield" => PlayerSubPosition::AttackingMidfield,
            "Second Striker" => PlayerSubPosition::SecondStriker,
            "Centre-Forward" => PlayerSubPosition::CentreForward,
            _ => PlayerSubPosition::Missing
        }
    }
}

pub fn map_position_code_to_position(s: &str) -> &str {
    match s {
        "GK" => "Goalkeeper",
        "LB" => "Left-Back",
        "CB" => "Centre-Back",
        "RB" => "Right-Back",
        "CDM" => "Defensive Midfield",
        "LM" => "Left Midfield",
        "CM" => "Central Midfield",
        "RM" => "Right Midfield",
        "LW" => "Left Winger",
        "RW" => "Right winger",
        "CAM" => "Attacking Midfield",
        "SS" => "Second Striker",
        "CF" => "Centre-Forward",
        _ => "Missing"
    }
}


#[derive(Copy, Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum PlayerPosition {
    Goalkeeper,
    Defender,
    Midfield,
    Attack,
    #[serde(rename = "Unknown")]
    Missing,
}

impl PlayerPosition {
    fn from_str(s: &str) -> Self {
        match s {
            "Goalkeeper" => PlayerPosition::Goalkeeper,
            "Defender" => PlayerPosition::Defender,
            "Midfield" => PlayerPosition::Midfield,
            "Attack" => PlayerPosition::Attack,
            _ => PlayerPosition::Missing
        }
    }
}

#[derive(Copy, Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Foot {
    Left,
    Right,
    Both,
    Missing,
}

impl Foot {
    fn from_str(s: &str) -> Self {
        match s {
            "left" => Foot::Left,
            "right" => Foot::Right,
            "both" => Foot::Both,
            _ => Foot::Missing
        }
    }
}

#[derive(Debug, Serialize, Clone, Deserialize)]
pub struct Player {
    player_id: i32,
    first_name: String,
    last_name: String,
    current_club_id: i32,
    country_of_birth: Country,
    country_code: String,
    city_of_birth: String,
    country_of_citizenship: Country,
    date_of_birth: NaiveDate,
    age: u32,
    sub_position: PlayerSubPosition,
    position: PlayerPosition,
    foot: Foot,
    height_in_cm: i32,
    image_url: String,
    highest_market_value_in_eur: i64,
    occurrences: i64,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlayerSearchResult {
    rank: i64,
    player_id: i32,
    player_name: String,
    country_of_citizenship: Country,
    country_code: String,
    sub_position: PlayerSubPosition,
    image_url: String,
    total_appearances: i64,
    substitute_appearances: i64,
    total_goals: i64,
    total_assists: i64,
    total_yellow_cards: i64,
    total_red_cards: i64,
    total_minutes_played: i64,
    clubs_played_for: String,
    mins_per_goal: i64,
    mins_per_assist: i64,
    mins_per_yellow: i64,
    mins_per_red: i64,
}


#[derive(Debug, Serialize, Clone)]
pub struct PlayerSeasonByCompAndTeam {
    player_id: i32,
    season: i32,
    club_id: i32,
    club_name: String,
    competition_id: String,
    competition_country_code: String,
    competition_name: Competition,
    competition_type: CompetitionType,
    competition_country: Country,
    competition_country_id: i32,
    total_appearances: i64,
    total_goals: i64,
    total_assists: i64,
    total_yellow_cards: i64,
    total_red_cards: i64,
    total_minutes_played: i64,
    mins_per_goal: Option<i64>,
    mins_per_assist: Option<i64>,
    mins_per_yellow_card: Option<i64>,
    mins_per_red_card: Option<i64>,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlayerWithSeason {
    player_id: i32,
    first_name: String,
    last_name: String,
    current_club_id: i32,
    country_of_birth: Country,
    country_code: String,
    city_of_birth: String,
    country_of_citizenship: Country,
    date_of_birth: NaiveDate,
    age: u32,
    sub_position: PlayerSubPosition,
    position: PlayerPosition,
    foot: Foot,
    height_in_cm: i32,
    image_url: String,
    highest_market_value_in_eur: i64,
    season: i32,
    club_id: i32,
    club_name: String,
    competition_id: String,
    competition_country_code: String,
    competition_name: Competition,
    competition_type: CompetitionType,
    competition_country: Country,
    competition_country_id: i32,
    total_appearances: i64,
    total_goals: i64,
    total_assists: i64,
    total_yellow_cards: i64,
    total_red_cards: i64,
    total_minutes_played: i64,
    mins_per_goal: Option<i64>,
    mins_per_assist: Option<i64>,
    mins_per_yellow_card: Option<i64>,
    mins_per_red_card: Option<i64>,
}

impl<'r> FromRow<'r, PgRow> for Player {
    fn from_row(row: &'r PgRow) -> Result<Self, Error> {
        let date_of_birth = row.try_get("date_of_birth").unwrap_or_default();
        let country_of_citizenship_str = row.try_get("country_of_citizenship").unwrap_or_default();
        let country_of_citizenship = Country::from_str(country_of_citizenship_str);
        Ok(Self {
            player_id: row.try_get("player_id").unwrap_or_default(),
            first_name: row.try_get("first_name").unwrap_or_default(),
            last_name: row.try_get("last_name").unwrap_or_default(),
            current_club_id: row.try_get("current_club_id").unwrap_or_default(),
            country_of_birth: {
                let country_of_birth = row.try_get("country_of_birth").unwrap_or_default();
                Country::from_str(country_of_birth)
            },
            city_of_birth: row.try_get("city_of_birth").unwrap_or_default(),
            country_of_citizenship: country_of_citizenship,
            country_code: country_of_citizenship.code().to_string(),
            date_of_birth,
            age: calculate_age(date_of_birth),
            sub_position: {
                let sub_position_string: &str = row.try_get("sub_position").unwrap_or_default();
                PlayerSubPosition::from_str(sub_position_string)
            },
            position: {
                let position_string: &str = row.try_get("position").unwrap_or_default();
                PlayerPosition::from_str(position_string)
            },
            foot: {
                let foot_string: &str = row.try_get("foot").unwrap_or_default();
                Foot::from_str(foot_string)
            },
            height_in_cm: row.try_get("height_in_cm").unwrap_or_default(),
            image_url: row.try_get("image_url").unwrap_or_default(),
            highest_market_value_in_eur: row.try_get("highest_market_value_in_eur").unwrap_or_default(),
            occurrences: row.try_get("occurrences").unwrap_or_default(),
        }
        )
    }
}

impl<'r> FromRow<'r, PgRow> for PlayerSeasonByCompAndTeam {
    fn from_row(row: &'r PgRow) -> Result<Self, Error> {
        let competition_country: &str = row.try_get("competition_country").unwrap_or("Europe");
        let country = Country::from_str(competition_country);
        Ok(Self {
            player_id: row.try_get("player_id").unwrap_or_default(),
            season: row.try_get("season").unwrap_or_default(),
            club_id: row.try_get("club_id").unwrap_or_default(),
            club_name: row.try_get("club_name").unwrap_or_default(),
            competition_id: row.try_get("competition_id").unwrap_or_default(),
            competition_name: {
                let competition_name = row.try_get("competition_name").unwrap_or_default();
                Competition::from_str(competition_name)
            },
            competition_type: {
                let competition_type: &str = row.try_get("competition_type").unwrap_or_default();
                CompetitionType::from_str(competition_type)
            },
            competition_country_code: country.code().to_string(),
            competition_country: {
                if country == Country::Missing {
                    Country::Europe
                } else {
                    country
                }
            },
            competition_country_id: row.try_get("competition_country_id").unwrap_or_default(),
            total_appearances: row.try_get("total_appearances").unwrap_or_default(),
            total_goals: row.try_get("total_goals").unwrap_or_default(),
            total_assists: row.try_get("total_assists").unwrap_or_default(),
            total_yellow_cards: row.try_get("total_yellow_cards").unwrap_or_default(),
            total_red_cards: row.try_get("total_red_cards").unwrap_or_default(),
            total_minutes_played: row.try_get("total_minutes_played").unwrap_or_default(),
            mins_per_goal: row.try_get("mins_per_goal").ok().unwrap_or_default(),
            mins_per_assist: row.try_get("mins_per_assist").ok().unwrap_or_default(),
            mins_per_yellow_card: row.try_get("mins_per_yellow_card").ok().unwrap_or_default(),
            mins_per_red_card: row.try_get("mins_per_red_card").ok().unwrap_or_default(),
        }
        )
    }
}

impl<'r> FromRow<'r, PgRow> for PlayerWithSeason {
    fn from_row(row: &'r PgRow) -> Result<Self, Error> {
        let date_of_birth = row.try_get("date_of_birth").unwrap_or_default();
        let country_of_citizenship_str = row.try_get("country_of_citizenship").unwrap_or_default();
        let country_of_citizenship = Country::from_str(country_of_citizenship_str);
        let competition_country: &str = row.try_get("competition_country").unwrap_or("Europe");
        let country = Country::from_str(competition_country);
        Ok(Self {
            player_id: row.try_get("player_id").unwrap_or_default(),
            first_name: row.try_get("first_name").unwrap_or_default(),
            last_name: row.try_get("last_name").unwrap_or_default(),
            current_club_id: row.try_get("current_club_id").unwrap_or_default(),
            country_of_birth: {
                let country_of_birth = row.try_get("country_of_birth").unwrap_or_default();
                Country::from_str(country_of_birth)
            },
            city_of_birth: row.try_get("city_of_birth").unwrap_or_default(),
            country_of_citizenship: country_of_citizenship,
            country_code: country_of_citizenship.code().to_string(),
            date_of_birth,
            age: calculate_age(date_of_birth),
            sub_position: {
                let sub_position_string: &str = row.try_get("sub_position").unwrap_or_default();
                PlayerSubPosition::from_str(sub_position_string)
            },
            position: {
                let position_string: &str = row.try_get("position").unwrap_or_default();
                PlayerPosition::from_str(position_string)
            },
            foot: {
                let foot_string: &str = row.try_get("foot").unwrap_or_default();
                Foot::from_str(foot_string)
            },
            height_in_cm: row.try_get("height_in_cm").unwrap_or_default(),
            image_url: row.try_get("image_url").unwrap_or_default(),
            highest_market_value_in_eur: row.try_get("highest_market_value_in_eur").unwrap_or_default(),
            season: row.try_get("season").unwrap_or_default(),
            club_id: row.try_get("club_id").unwrap_or_default(),
            club_name: row.try_get("club_name").unwrap_or_default(),
            competition_id: row.try_get("competition_id").unwrap_or_default(),
            competition_name: {
                let competition_name = row.try_get("competition_name").unwrap_or_default();
                Competition::from_str(competition_name)
            },
            competition_type: {
                let competition_type: &str = row.try_get("competition_type").unwrap_or_default();
                CompetitionType::from_str(competition_type)
            },
            competition_country_code: country.code().to_string(),
            competition_country: {
                if country == Country::Missing {
                    Country::Europe
                } else {
                    country
                }
            },
            competition_country_id: row.try_get("competition_country_id").unwrap_or_default(),
            total_appearances: row.try_get("total_appearances").unwrap_or_default(),
            total_goals: row.try_get("total_goals").unwrap_or_default(),
            total_assists: row.try_get("total_assists").unwrap_or_default(),
            total_yellow_cards: row.try_get("total_yellow_cards").unwrap_or_default(),
            total_red_cards: row.try_get("total_red_cards").unwrap_or_default(),
            total_minutes_played: row.try_get("total_minutes_played").unwrap_or_default(),
            mins_per_goal: row.try_get("mins_per_goal").ok().unwrap_or_default(),
            mins_per_assist: row.try_get("mins_per_assist").ok().unwrap_or_default(),
            mins_per_yellow_card: row.try_get("mins_per_yellow_card").ok().unwrap_or_default(),
            mins_per_red_card: row.try_get("mins_per_red_card").ok().unwrap_or_default(),
        }
        )
    }
}

impl<'r> FromRow<'r, PgRow> for PlayerSearchResult {
    fn from_row(row: &'r PgRow) -> Result<Self, Error> {
        let country_of_citizenship_str = row.try_get("country_of_citizenship").unwrap_or_default();
        let country_of_citizenship = Country::from_str(country_of_citizenship_str);
        Ok(Self {
            rank: row.try_get("rank").unwrap_or_default(),
            player_id: row.try_get("player_id").unwrap_or_default(),
            player_name: row.try_get("player_name").unwrap_or_default(),
            country_of_citizenship: country_of_citizenship,
            country_code: country_of_citizenship.code().to_string(),
            sub_position: {
                let sub_position_string: &str = row.try_get("sub_position").unwrap_or_default();
                PlayerSubPosition::from_str(sub_position_string)
            },
            image_url: row.try_get("image_url").unwrap_or_default(),
            total_appearances: row.try_get("total_appearances").unwrap_or_default(),
            substitute_appearances: row.try_get("substitute_appearances").unwrap_or_default(),
            total_goals: row.try_get("total_goals").unwrap_or_default(),
            total_assists: row.try_get("total_assists").unwrap_or_default(),
            total_yellow_cards: row.try_get("total_yellow_cards").unwrap_or_default(),
            total_red_cards: row.try_get("total_red_cards").unwrap_or_default(),
            total_minutes_played: row.try_get("total_minutes_played").unwrap_or_default(),
            clubs_played_for: row.try_get("clubs_played_for").unwrap_or_default(),
            mins_per_goal: row.try_get("mins_per_goal").unwrap_or_default(),
            mins_per_assist: row.try_get("mins_per_assist").unwrap_or_default(),
            mins_per_yellow: row.try_get("mins_per_yellow").unwrap_or_default(),
            mins_per_red: row.try_get("mins_per_red").unwrap_or_default(),
        })
    }
}


fn calculate_age(date_of_birth: NaiveDate) -> u32 {
    let today = Utc::now().naive_utc().date();
    today.years_since(date_of_birth).unwrap_or_default()
}




