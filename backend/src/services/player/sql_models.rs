use chrono::{NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Error, FromRow, Row};
use sqlx::postgres::PgRow;
use crate::competitions::{Competition, CompetitionType};
use crate::countries::Country;
use crate::services::player::player_enums::{Foot, PlayerPosition, PlayerSubPosition};

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
    foot: Foot,
    height_in_cm: i32,
    image_url: String,
    highest_market_value_in_eur: i64,
    occurrences: i64,
}

impl<'r> FromRow<'r, PgRow> for Player {
    fn from_row(row: &'r PgRow) -> Result<Self, Error> {
        let date_of_birth = row.try_get("date_of_birth").unwrap_or_default();
        let country_of_citizenship = Country::from_str(try_get_or_default(row, "country_of_citizenship"));
        Ok(Self {
            player_id: try_get_or_default(row, "player_id"),
            first_name: try_get_or_default(row, "first_name"),
            last_name: try_get_or_default(row, "last_name"),
            current_club_id: try_get_or_default(row, "current_club_id"),
            country_of_birth: Country::from_str(try_get_or_default(row, "country_of_birth")),
            city_of_birth: try_get_or_default(row, "city_of_birth"),
            country_of_citizenship,
            country_code: country_of_citizenship.code().to_string(),
            date_of_birth,
            age: calculate_age(date_of_birth),
            sub_position: PlayerSubPosition::try_from(try_get_or_default::<&str>(row, "sub_position")).unwrap_or(PlayerSubPosition::Missing),
            foot: Foot::try_from(try_get_or_default::<&str>(row, "foot")).unwrap_or(Foot::Missing),
            height_in_cm: try_get_or_default(row, "height_in_cm"),
            image_url: try_get_or_default(row, "image_url"),
            highest_market_value_in_eur: try_get_or_default(row, "highest_market_value_in_eur"),
            occurrences: try_get_or_default(row, "occurrences")
        })
    }
}

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
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
    mins_per_goal_or_assist: i64,
    mins_per_yellow: i64,
    mins_per_red: i64,
    season: i32
}

impl PlayerSearchResult {
    pub fn new(rank: i64, player_id: i32, player_name: String, country_of_citizenship: Country,
               country_code: String, sub_position: PlayerSubPosition, image_url: String,
               total_appearances: i64, substitute_appearances: i64, total_goals: i64, total_assists:
               i64, total_yellow_cards: i64, total_red_cards: i64, total_minutes_played: i64,
               clubs_played_for: String, mins_per_goal: i64, mins_per_assist: i64,
               mins_per_goal_or_assist: i64, mins_per_yellow: i64, mins_per_red: i64, season: i32) -> Self {

        Self { rank, player_id, player_name, country_of_citizenship, country_code, sub_position, image_url,
            total_appearances, substitute_appearances, total_goals, total_assists, total_yellow_cards,
            total_red_cards, total_minutes_played, clubs_played_for, mins_per_goal, mins_per_assist,
            mins_per_goal_or_assist, mins_per_yellow, mins_per_red, season }
    }
}

impl<'r> FromRow<'r, PgRow> for PlayerSearchResult {
    fn from_row(row: &'r PgRow) -> Result<Self, Error> {
        let country_of_citizenship = Country::from_str(try_get_or_default(row, "country_of_citizenship"));
        Ok(Self {
            rank: try_get_or_default(row, "rank"),
            player_id: try_get_or_default(row, "player_id"),
            player_name: try_get_or_default(row, "player_name"),
            country_of_citizenship,
            country_code: country_of_citizenship.code().to_string(),
            sub_position: PlayerSubPosition::try_from(try_get_or_default::<&str>(row, "sub_position")).unwrap_or(PlayerSubPosition::Missing),
            image_url: try_get_or_default(row, "image_url"),
            total_appearances: try_get_or_default(row, "total_appearances"),
            substitute_appearances: try_get_or_default(row, "substitute_appearances"),
            total_goals: try_get_or_default(row, "total_goals"),
            total_assists: try_get_or_default(row, "total_assists"),
            total_yellow_cards: try_get_or_default(row, "total_yellow_cards"),
            total_red_cards: try_get_or_default(row, "total_red_cards"),
            total_minutes_played: try_get_or_default(row, "total_minutes_played"),
            clubs_played_for: try_get_or_default(row, "clubs_played_for"),
            mins_per_goal: try_get_or_default(row, "mins_per_goal"),
            mins_per_assist: try_get_or_default(row, "mins_per_assist"),
            mins_per_goal_or_assist: try_get_or_default(row, "mins_per_goal_or_assist"),
            mins_per_yellow: try_get_or_default(row, "mins_per_yellow"),
            mins_per_red: try_get_or_default(row, "mins_per_red"),
            season: try_get_or_default(row, "season")
        })
    }
}

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
pub struct PlayerGameSearchResult {
    rank: i64,
    player_id: i32,
    player_name: String,
    country_of_citizenship: Country,
    country_code: String,
    sub_position: PlayerSubPosition,
    image_url: String,
    club_id: i32,
    competition_id: String,
    competition_name: Competition,
    competition_country_code: String,
    date: NaiveDate,
    season: i32,
    home_club_id: i32,
    home_club_name: String,
    home_club_goals: i32,
    away_club_id: i32,
    away_club_name: String,
    away_club_goals: i32,
    minutes_played: i32,
    goals: i32,
    assists: i32
}

impl PlayerGameSearchResult {
    pub fn new(rank: i64, player_id: i32, player_name: String, country_of_citizenship: Country,
               country_code: String, sub_position: PlayerSubPosition, image_url: String,
               club_id: i32, competition_id: String, competition_name: Competition,
               competition_country_code: String, date: NaiveDate, season: i32, home_club_id: i32,
               home_club_name: String, home_club_goals: i32, away_club_id: i32, away_club_name: String,
               away_club_goals: i32, minutes_played: i32, goals: i32, assists: i32) -> Self {

        Self { rank, player_id, player_name, country_of_citizenship, country_code,
            sub_position, image_url, club_id, competition_id, competition_name,
            competition_country_code, date, season, home_club_id, home_club_name,
            home_club_goals, away_club_id, away_club_name, away_club_goals, minutes_played,
            goals, assists }
    }
}



impl<'r> FromRow<'r, PgRow> for PlayerGameSearchResult {
    fn from_row(row: &'r PgRow) -> Result<Self, Error> {
        let country_of_citizenship = Country::from_str(try_get_or_default(row, "country_of_citizenship"));
        let competition_country: &str = row.try_get("competition_country").unwrap_or("Europe");
        let country = Country::from_str(competition_country);
        Ok(Self {
            rank: try_get_or_default(row, "rank"),
            player_id: try_get_or_default(row, "player_id"),
            player_name: try_get_or_default(row, "player_name"),
            country_of_citizenship,
            country_code: country_of_citizenship.code().to_string(),
            sub_position: PlayerSubPosition::try_from(try_get_or_default::<&str>(row, "sub_position")).unwrap_or(PlayerSubPosition::Missing),
            image_url: try_get_or_default(row, "image_url"),
            club_id: try_get_or_default(row, "club_id"),
            competition_id: try_get_or_default(row, "competition_id"),
            competition_name: Competition::from_str(try_get_or_default(row, "competition_name")),
            competition_country_code: String::from(country.code()),
            date: try_get_or_default(row, "date"),
            season: try_get_or_default(row, "season"),
            home_club_id: try_get_or_default(row, "home_club_id"),
            home_club_name: try_get_or_default(row, "home_club_name"),
            home_club_goals: try_get_or_default(row, "home_club_goals"),
            away_club_id: try_get_or_default(row, "away_club_id"),
            away_club_name: try_get_or_default(row, "away_club_name"),
            away_club_goals: try_get_or_default(row, "away_club_goals"),
            minutes_played: try_get_or_default(row, "minutes_played"),
            goals: try_get_or_default(row, "goals"),
            assists: try_get_or_default(row, "assists")
        })
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct PlayerNumberOfGamesOrSeasonsResult {
    rank: i64,
    player_id: i32,
    player_name: String,
    country_of_citizenship: Country,
    country_code: String,
    sub_position: PlayerSubPosition,
    image_url: String,
    clubs_played_for: String,
    season: i32,
    number_of_games: i64,
    number_of_seasons: i64
}

impl PlayerNumberOfGamesOrSeasonsResult {
    pub fn new(rank: i64, player_id: i32, player_name: String, country_of_citizenship: Country,
               country_code: String, sub_position: PlayerSubPosition, image_url: String,
               clubs_played_for: String, season: i32, number_of_games: i64, number_of_seasons: i64) -> Self {

        Self { rank, player_id, player_name, country_of_citizenship, country_code, sub_position,
            image_url, clubs_played_for, season, number_of_games, number_of_seasons }
    }
}

impl<'r> FromRow<'r, PgRow> for PlayerNumberOfGamesOrSeasonsResult {
    fn from_row(row: &'r PgRow) -> Result<Self, Error> {
        let country_of_citizenship = Country::from_str(try_get_or_default(row, "country_of_citizenship"));
        Ok(Self {
            rank: try_get_or_default(row, "rank"),
            player_id: try_get_or_default(row, "player_id"),
            player_name: try_get_or_default(row, "player_name"),
            country_of_citizenship,
            country_code: country_of_citizenship.code().to_string(),
            sub_position: PlayerSubPosition::try_from(try_get_or_default::<&str>(row, "sub_position")).unwrap_or(PlayerSubPosition::Missing),
            image_url: try_get_or_default(row, "image_url"),
            clubs_played_for: try_get_or_default(row, "clubs_played_for"),
            season: try_get_or_default(row, "season"),
            number_of_games: try_get_or_default(row, "number_of_games"),
            number_of_seasons: try_get_or_default(row, "number_of_seasons")
        })
    }
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

impl<'r> FromRow<'r, PgRow> for PlayerWithSeason {
    fn from_row(row: &'r PgRow) -> Result<Self, Error> {
        let date_of_birth = try_get_or_default(row, "date_of_birth");
        let country_of_citizenship = Country::from_str(try_get_or_default(row, "country_of_citizenship"));
        let competition_country: &str = row.try_get("competition_country").unwrap_or("Europe");
        let country = Country::from_str(competition_country);
        Ok(Self {
            player_id: try_get_or_default(row, "player_id"),
            first_name: try_get_or_default(row, "first_name"),
            last_name: try_get_or_default(row, "last_name"),
            current_club_id: try_get_or_default(row, "current_club_id"),
            country_of_birth: Country::from_str(try_get_or_default(row, "country_of_birth")),
            city_of_birth: try_get_or_default(row, "city_of_birth"),
            country_of_citizenship,
            country_code: country_of_citizenship.code().to_string(),
            date_of_birth,
            age: calculate_age(date_of_birth),
            sub_position: PlayerSubPosition::try_from(try_get_or_default::<&str>(row, "sub_position")).unwrap_or(PlayerSubPosition::Missing),
            position: PlayerPosition::try_from(try_get_or_default::<&str>(row, "position")).unwrap_or(PlayerPosition::Missing),
            foot: Foot::try_from(try_get_or_default::<&str>(row, "foot")).unwrap_or(Foot::Missing),
            height_in_cm: try_get_or_default(row, "height_in_cm"),
            image_url: try_get_or_default(row, "image_url"),
            highest_market_value_in_eur: try_get_or_default(row, "highest_market_value_in_eur"),
            season: try_get_or_default(row, "season"),
            club_id: try_get_or_default(row, "club_id"),
            club_name: try_get_or_default(row, "club_name"),
            competition_id: try_get_or_default(row, "competition_id"),
            competition_name: Competition::from_str(try_get_or_default(row, "competition_name")),
            competition_type: CompetitionType::from_str(try_get_or_default(row, "competition_type")),
            competition_country_code: country.code().to_string(),
            competition_country: {
                if country == Country::Missing {
                    Country::Europe
                } else {
                    country
                }
            },
            competition_country_id: try_get_or_default(row, "competition_country_id"),
            total_appearances: try_get_or_default(row, "total_appearances"),
            total_goals: try_get_or_default(row, "total_goals"),
            total_assists: try_get_or_default(row, "total_assists"),
            total_yellow_cards: try_get_or_default(row, "total_yellow_cards"),
            total_red_cards: try_get_or_default(row, "total_red_cards"),
            total_minutes_played: try_get_or_default(row, "total_minutes_played"),
            mins_per_goal: try_get_or_default(row, "mins_per_goal"),
            mins_per_assist: try_get_or_default(row, "mins_per_assist"),
            mins_per_yellow_card: try_get_or_default(row, "mins_per_yellow_card"),
            mins_per_red_card: try_get_or_default(row, "mins_per_red_card")
        })
    }
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

impl<'r> FromRow<'r, PgRow> for PlayerSeasonByCompAndTeam {
    fn from_row(row: &'r PgRow) -> Result<Self, Error> {
        let competition_country: &str = row.try_get("competition_country").unwrap_or("Europe");
        let country = Country::from_str(competition_country);
        Ok(Self {
            player_id: try_get_or_default(row, "player_id"),
            season: try_get_or_default(row, "season"),
            club_id: try_get_or_default(row, "club_id"),
            club_name: try_get_or_default(row, "club_name"),
            competition_id: try_get_or_default(row, "competition_id"),
            competition_name: Competition::from_str(try_get_or_default(row, "competition_name")),
            competition_type: CompetitionType::from_str(try_get_or_default(row, "competition_type")),
            competition_country_code: country.code().to_string(),
            competition_country: {
                if country == Country::Missing {
                    Country::Europe
                } else {
                    country
                }
            },
            competition_country_id: try_get_or_default(row, "competition_country_id"),
            total_appearances: try_get_or_default(row, "total_appearances"),
            total_goals: try_get_or_default(row, "total_goals"),
            total_assists: try_get_or_default(row, "total_assists"),
            total_yellow_cards: try_get_or_default(row, "total_yellow_cards"),
            total_red_cards: try_get_or_default(row, "total_red_cards"),
            total_minutes_played: try_get_or_default(row, "total_minutes_played"),
            mins_per_goal: try_get_or_default(row, "mins_per_goal"),
            mins_per_assist: try_get_or_default(row, "mins_per_assist"),
            mins_per_yellow_card: try_get_or_default(row, "mins_per_yellow_card"),
            mins_per_red_card: try_get_or_default(row, "mins_per_red_card"),
        })
    }
}

fn calculate_age(date_of_birth: NaiveDate) -> u32 {
    let today = Utc::now().naive_utc().date();
    today.years_since(date_of_birth).unwrap_or_default()
}

fn try_get_or_default<'r, T>(row: &'r PgRow, col: &str) -> T
where
    T: Default + sqlx::Type<sqlx::Postgres> + sqlx::Decode<'r, sqlx::Postgres>,
{
    row.try_get(col).unwrap_or_default()
}