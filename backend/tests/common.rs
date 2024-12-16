use actix_web::{test, App};
use actix_web::http::StatusCode;
use actix_web::test::TestRequest;
use dotenv::dotenv;
use serde::de::DeserializeOwned;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use football_game::competitions::Competition;
use football_game::countries::Country;
use football_game::services::club::search_clubs::get_clubs;
use football_game::services::player::models::{HomeAwayOption, PenaltyOption, SearchParams, SortOption, StatScope};
use football_game::services::player::player_enums::{PlayerSubPosition};
use football_game::services::player::search_by_count::search_by_count;
use football_game::services::player::search_by_game::search_by_game;
use football_game::services::player::search_by_season_or_across_seasons::search_by_season_or_across_seasons;

#[cfg(test)]
pub async fn setup_test_db() -> PgPool {
    dotenv().ok();
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Error building a connection pool")
}

#[cfg(test)]
pub async fn test_search<T: DeserializeOwned + PartialEq + std::fmt::Debug + Clone>(base_search_url: &str, query: &str, result_size: usize, expected_top_result: T) {
    let pool = setup_test_db().await;

    let app = test::init_service(
        App::new()
            .app_data(actix_web::web::Data::new(pool))
            .service(search_by_season_or_across_seasons)
            .service(get_clubs)
            .service(search_by_count)
            .service(search_by_game)
    ).await;

    let search_uri = format!("{}{}", base_search_url, query);

    let request = TestRequest::get().uri(search_uri.as_str())
        .to_request();

    let response = test::call_service(&app, request).await;

    assert_eq!(response.status(), StatusCode::OK);

    let body: Vec<T> = test::read_body_json(response).await;
    assert_eq!(body.len(), result_size);

    let top_result = body[0].clone();

    assert_eq!(expected_top_result, top_result);
}

#[cfg(test)]
#[derive(Default)]
pub struct SearchParamsBuilder {
    params: SearchParams,
}

#[cfg(test)]
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
        self.params.seasons = Some(seasons.iter().map(|&season|
            season.to_string()).collect::<Vec<String>>().join(","));
        self
    }

    pub fn competitions(mut self, competitions: Vec<Competition>) -> Self {
        let competition_codes: Vec<&str> = competitions.iter().map(|comp| get_code_from_competition(comp)).collect();

        self.params.competitions = Some(competition_codes.join(","));
        self
    }

    pub fn positions(mut self, positions: Vec<PlayerSubPosition>) -> Self {
        let position_codes: Vec<&str> = positions.iter().map(|pos| get_code_from_sub_position(&pos)).collect();
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
        let country_codes: Vec<&str> = countries.iter().map(|country| country.code()).collect();
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
        self.params.penalty = Some(get_code_from_penalty_option(&penalty).to_string());
        self
    }

    pub fn home_or_away(mut self, home_or_away: HomeAwayOption) -> Self {
        self.params.home_or_away = Some(get_code_from_home_away_option(&home_or_away).to_string());
        self
    }

    pub fn scope(mut self, scope: StatScope) -> Self {
        self.params.scope = Some(get_code_from_scope(&scope).to_string());
        self
    }

    pub fn sort(mut self, sort: SortOption) -> Self {
        self.params.sort = Some(get_code_from_sort_option(&sort).to_string());
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

    pub fn build_query(self) -> String {
        let params = self.params;
        let query_string = serde_urlencoded::to_string(&params).unwrap();
        query_string
    }
}

#[cfg(test)]
pub fn get_code_from_competition(competition: &Competition) -> &'static str {
    match competition {
        Competition::BelgianLeague => "BE1",
        Competition::BelgianSuperCup => "BESC",
        Competition::CopaDelRey => "CDR",
        Competition::EFLCup => "CGB",
        Competition::ItalyCup => "CIT",
        Competition::ChampionsLeague => "CL",
        Competition::ChampionsLeagueQualification => "CLQ",
        Competition::DFBPokal => "DFB",
        Competition::DFLSuperCup => "DFL",
        Competition::Superligaen => "DK1",
        Competition::SydbankPokalen => "DKP",
        Competition::EuropaConferenceLeagueQualification => "ECLQ",
        Competition::EuropaLeague => "EL",
        Competition::EuropaLeagueQualification => "ELQ",
        Competition::LaLiga => "ES1",
        Competition::FACup => "FAC",
        Competition::Ligue1 => "FR1",
        Competition::TrophesDesChampions => "FRCH",
        Competition::PremierLeague => "GB1",
        Competition::CommunityShield => "GBCS",
        Competition::SuperLeague1 => "GR1",
        Competition::KypelloElladas => "GRP",
        Competition::SerieA => "IT1",
        Competition::FIFAKlubWM => "KLUB",
        Competition::Bundesliga => "L1",
        Competition::Eredivisie => "NL1",
        Competition::TotoKNVBBeker => "NLP",
        Competition::JohanCruijffSchaal => "NLSC",
        Competition::LigaPortugalBwin => "PO1",
        Competition::AllianzCup => "POCP",
        Competition::SupertacaCandidoDeOliveira => "POSU",
        Competition::PremierLiga => "RU1",
        Competition::RussianCup => "RUP",
        Competition::RussianSuperCup => "RUSS",
        Competition::ScottishPremiership => "SC1",
        Competition::SupercoppaItaliana => "SCI",
        Competition::SFACup => "SFA",
        Competition::Supercopa => "SUC",
        Competition::SuperLig => "TR1",
        Competition::UEFAConferenceLeague => "UCOL",
        Competition::UkrainianCup => "UKRP",
        Competition::UkrainianSuperCup => "UKRS",
        Competition::UEFASuperCup => "USC",
        Competition::Missing => "",
    }
}

#[cfg(test)]
pub fn get_code_from_sort_option(sort_option: &SortOption) -> &'static str {
    match sort_option {
        SortOption::Goals => "g",
        SortOption::Assists => "a",
        SortOption::GoalsAndAssists => "ga",
        SortOption::Appearances => "ap",
        SortOption::MinutesPlayed => "m",
        SortOption::YellowCards => "y",
        SortOption::RedCards => "r",
        SortOption::MinutesPerGoal => "mpg",
        SortOption::MinutesPerAssist => "mpa",
        SortOption::MinutesPerGoalOrAssist => "mpga",
        SortOption::MinutesPerYellow => "mpy",
        SortOption::MinutesPerRed => "mpr",
        SortOption::NumberOfGamesWith => "gw",
        SortOption::NumberOfSeasonsWith => "sw"
    }
}

#[cfg(test)]
pub fn get_code_from_penalty_option(penalty_option: &PenaltyOption) -> &'static str {
    match penalty_option {
        PenaltyOption::IncludePenalties => "ip",
        PenaltyOption::ExcludePenalties => "ep",
        PenaltyOption::OnlyPenalties => "op"
    }
}

#[cfg(test)]
pub fn get_code_from_home_away_option(home_or_away_option: &HomeAwayOption) -> &'static str {
    match home_or_away_option {
        HomeAwayOption::Either => "e",
        HomeAwayOption::Away => "a",
        HomeAwayOption::Home => "h"
    }
}

#[cfg(test)]
pub fn get_code_from_scope(scope: &StatScope) -> &'static str {
    match scope {
        StatScope::Season => "s",
        StatScope::Overall => "o",
        StatScope::Game => "g"
    }
}

#[cfg(test)]
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
        PlayerSubPosition::Missing => ""
    }
}