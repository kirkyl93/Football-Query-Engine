use football_game::competitions::Competition;
use football_game::countries::Country;
use football_game::services::player::models::{HomeAwayOption, PenaltyOption, SortOption, StatScope};
use football_game::services::player::player_enums::PlayerSubPosition;
use football_game::services::player::sql_models::PlayerNumberOfGamesOrSeasonsResult;
use crate::common::{test_search, SearchParamsBuilder};

pub mod common;

const BASE_OCCURRENCES_URL: &str = "/search/occurrences?";

#[actix_web::test]
async fn test_number_of_games_in_a_season() {
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .penalty(PenaltyOption::OnlyPenalties)
        .home_or_away(HomeAwayOption::Either)
        .sort(SortOption::NumberOfGamesWith)
        .minimum_goals(1)
        .maximum_goals(1)
        .scope(StatScope::Season)
        .build_query();

    test_search(
        BASE_OCCURRENCES_URL,
        query.as_str(),
        50,
        PlayerNumberOfGamesOrSeasonsResult::new(
            1, 3110, String::from("Alan Shearer"), Country::England,
            String::from("gb-eng"), PlayerSubPosition::CentreForward,
            String::from("https://img.a.transfermarkt.technology/portrait/header/3110-1485180006.jpg?lm=1"),
            String::from("164"), 1994, 9, 0)
    ).await;
}

#[actix_web::test]
async fn test_number_of_games_in_a_season_with_minute_filter() {
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .penalty(PenaltyOption::IncludePenalties)
        .home_or_away(HomeAwayOption::Either)
        .minute_played_from(85)
        .sort(SortOption::NumberOfGamesWith)
        .minimum_goals(1)
        .scope(StatScope::Season)
        .build_query();

    test_search(
        BASE_OCCURRENCES_URL,
        query.as_str(),
        50,
        PlayerNumberOfGamesOrSeasonsResult::new(
            1, 3163, String::from("Frank Lampard"), Country::England,
            String::from("gb-eng"), PlayerSubPosition::CentralMidfield,
            String::from("https://img.a.transfermarkt.technology/portrait/header/3163-1674475335.jpg?lm=1"),
            String::from("631"), 2009, 6, 0)
    ).await;
}

#[actix_web::test]
async fn test_number_of_games_overall() {
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::LaLiga])
        .home_or_away(HomeAwayOption::Either)
        .sort(SortOption::NumberOfGamesWith)
        .minimum_goals_and_assists(3)
        .maximum_goals_and_assists(4)
        .scope(StatScope::Overall)
        .build_query();

    test_search(
        BASE_OCCURRENCES_URL,
        query.as_str(),
        50,
        PlayerNumberOfGamesOrSeasonsResult::new(
            1, 28003, String::from("Lionel Messi"), Country::Argentina,
            String::from("ar"), PlayerSubPosition::RightWinger,
            String::from("https://img.a.transfermarkt.technology/portrait/header/28003-1771694720.jpg?lm=1"),
            String::from("131"), 0, 84, 0)
    ).await;
}

#[actix_web::test]
async fn test_number_of_games_overall_with_minute_filter() {
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .home_or_away(HomeAwayOption::Either)
        .sort(SortOption::NumberOfGamesWith)
        .minute_played_from(77)
        .minimum_assists(1)
        .maximum_assists(2)
        .scope(StatScope::Overall)
        .build_query();

    test_search(
        BASE_OCCURRENCES_URL,
        query.as_str(),
        50,
        PlayerNumberOfGamesOrSeasonsResult::new(
            1, 3406, String::from("Ryan Giggs"), Country::Wales,
            String::from("gb-wls"), PlayerSubPosition::LeftMidfield,
            String::from("https://img.a.transfermarkt.technology/portrait/header/3406-1589198838.jpg?lm=1"),
            String::from("985"), 0, 41, 0)
    ).await;
}

#[actix_web::test]
async fn test_number_of_seasons() {
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .home_or_away(HomeAwayOption::Either)
        .sort(SortOption::NumberOfSeasonsWith)
        .minimum_assists(5)
        .minimum_goals(18)
        .build_query();

    test_search(
        BASE_OCCURRENCES_URL,
        query.as_str(),
        50,
        PlayerNumberOfGamesOrSeasonsResult::new(
            1, 148455, String::from("Mohamed Salah"), Country::Egypt,
            String::from("eg"), PlayerSubPosition::RightWinger,
            String::from("https://img.a.transfermarkt.technology/portrait/header/148455-1727337594.jpg?lm=1"),
            String::from("31"), 0, 0, 8)
    ).await;
}

#[actix_web::test]
async fn test_number_of_seasons_with_minute_filter() {
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .home_or_away(HomeAwayOption::Either)
        .sort(SortOption::NumberOfSeasonsWith)
        .minute_played_to(15)
        .minimum_goals(3)
        .build_query();

    test_search(
        BASE_OCCURRENCES_URL,
        query.as_str(),
        50,
        PlayerNumberOfGamesOrSeasonsResult::new(
            1, 132098, String::from("Harry Kane"), Country::England,
            String::from("gb-eng"), PlayerSubPosition::CentreForward,
            String::from("https://img.a.transfermarkt.technology/portrait/header/132098-1700211169.jpg?lm=1"),
            String::from("148"), 0, 0, 7)
    ).await;
}


