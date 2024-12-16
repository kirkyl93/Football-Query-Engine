use actix_web::{test};
use football_game::competitions::Competition;
use football_game::countries::Country;
use football_game::services::player::models::{HomeAwayOption, PenaltyOption, SortOption, StatScope};
use football_game::services::player::player_enums::PlayerSubPosition;
use football_game::services::player::sql_models::{PlayerSearchResult};
use crate::common::{test_search, SearchParamsBuilder};

pub mod common;

const BASE_SEARCH_URL: &str = "/search?";
#[test]
async fn premier_league_top_goalscorers() {
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .build_query();

    test_search(
        BASE_SEARCH_URL,
        query.as_str(),
        50,
        PlayerSearchResult::new(
            1, 3110, String::from("Alan Shearer"), Country::England,
            String::from("gb-eng"), PlayerSubPosition::CentreForward,
            String::from("https://img.a.transfermarkt.technology/portrait/header/3110-1485180006.jpg?lm=1"),
            441, 14, 260, 68,
            44, 2, 38199, String::from("164, 762"), 146,
            561, 116, 868, 19099, 0)).await;
}

#[test]
async fn premier_league_most_assists_with_season_filter() {
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .sort(SortOption::Assists)
        .seasons(vec![2005, 2006, 2007, 2008, 2009, 2010, 2011])
        .build_query();

    test_search(
        BASE_SEARCH_URL,
        query.as_str(),
        50,
        PlayerSearchResult::new(
            1, 8806, String::from("Cesc Fàbregas"), Country::Spain, String::from("es"), PlayerSubPosition::CentralMidfield,
            String::from("https://img.a.transfermarkt.technology/portrait/header/8806-1614090062.jpg?lm=1"),
            179, 13, 33, 74,
            39, 1, 14672, String::from("11"), 444,
            198, 137, 376, 14672, 0)).await;
}

#[test]
async fn premier_league_most_yellows() {
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .sort(SortOption::YellowCards)
        .build_query();

    test_search(
        BASE_SEARCH_URL,
        query.as_str(),
        50,
        PlayerSearchResult::new(
            1, 3291, String::from("Gareth Barry"), Country::England,
            String::from("gb-eng"), PlayerSubPosition::DefensiveMidfield,
            String::from("https://img.a.transfermarkt.technology/portrait/header/3291-1481886107.jpg?lm=1"),
            653, 35, 53, 68,
            126, 6, 54443, String::from("281, 29, 405, 984"), 1027,
            800, 449, 432, 9073, 0)).await;
}

#[test]
async fn premier_league_most_reds() {
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .sort(SortOption::RedCards)
        .build_query();

    test_search(
        BASE_SEARCH_URL,
        query.as_str(),
        50,
        PlayerSearchResult::new(
            1, 3239, String::from("Duncan Ferguson"), Country::Scotland,
            String::from("gb-sct"), PlayerSubPosition::CentreForward,
            String::from("https://img.a.transfermarkt.technology/portrait/header/s_3239_123_2012_1.jpg?lm=1"),
            269, 83, 68, 11,
            39, 8, 17803, String::from("29, 762"), 261,
            1618, 225, 456, 2225, 0)).await;
}

#[test]
async fn premier_league_most_goals_and_assists_combined_with_season_filter() {
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .sort(SortOption::GoalsAndAssists)
        .seasons(vec![1999, 2000, 2001, 2002, 2003])
        .build_query();

    test_search(
        BASE_SEARCH_URL,
        query.as_str(),
        50,
        PlayerSearchResult::new(
            1, 3207, String::from("Thierry Henry"), Country::France,
            String::from("fr"), PlayerSubPosition::CentreForward,
            String::from("https://img.a.transfermarkt.technology/portrait/header/3207-1683199668.jpg?lm=1"),
            173, 15, 112, 51,
            25, 0, 14245, String::from("11"), 127,
            279, 87, 569, 0, 0)).await;
}

#[test]
async fn premier_league_best_minutes_per_goal_with_various_filters() {
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .countries(vec![Country::Togo, Country::Australia])
        .penalty(PenaltyOption::IncludePenalties)
        .home_or_away(HomeAwayOption::Either)
        .sort(SortOption::MinutesPerGoal)
        .minimum_appearances(50)
        .scope(StatScope::Overall)
        .build_query();

    test_search(
        BASE_SEARCH_URL,
        query.as_str(),
        15,
        PlayerSearchResult::new(
            1, 8883, String::from("Emmanuel Adebayor"), Country::Togo,
            String::from("tg"), PlayerSubPosition::CentreForward,
            String::from("https://img.a.transfermarkt.technology/portrait/header/8883-1565870134.jpg?lm=1"),
            242, 43, 97, 40,
            20, 2, 17928, String::from("11, 148, 281, 873"), 184,
            448, 130, 896, 8964, 0)).await;
}

#[test]
async fn premier_league_centre_back_with_most_goals_minute_filter_applied() {
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .minute_played_from(3)
        .minute_played_to(90)
        .positions(vec![PlayerSubPosition::CentreBack])
        .home_or_away(HomeAwayOption::Either)
        .scope(StatScope::Overall)
        .build_query();

    test_search(
        BASE_SEARCH_URL,
        query.as_str(),
        50,
        PlayerSearchResult::new(
            1, 3160, String::from("John Terry"), Country::England,
            String::from("gb-eng"), PlayerSubPosition::CentreBack,
            String::from("https://img.a.transfermarkt.technology/portrait/header/3160-1462887884.jpg?lm=1"),
            492, 19, 44, 16,
            53, 5, 41044, String::from("631"), 932,
            2565, 684, 774, 8208, 0)).await;
}

#[test]
async fn best_individual_season_minutes_per_goal_and_assist_with_filters() {
    let query = SearchParamsBuilder::new()
        .names(vec!["David"])
        .penalty(PenaltyOption::ExcludePenalties)
        .home_or_away(HomeAwayOption::Home)
        .sort(SortOption::MinutesPerGoalOrAssist)
        .minimum_appearances(15)
        .scope(StatScope::Season)
        .build_query();

    test_search(
        BASE_SEARCH_URL,
        query.as_str(),
        50,
        PlayerSearchResult::new(
            1, 4146, String::from("David Trezeguet"), Country::France,
            String::from("fr"), PlayerSubPosition::CentreForward,
            String::from("https://img.a.transfermarkt.technology/portrait/header/4146-1491231443.jpg?lm=1"),
            19, 7, 17, 1,
            0, 0, 1205, String::from("162"), 70,
            1205, 66, 0, 0, 1997)).await;
}

#[test]
async fn most_goals_as_a_sub_with_minute_filter_and_others_applied() {
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague, Competition::ChampionsLeague])
        .minute_played_from(60)
        .minute_played_to(88)
        .clubs_played_for(vec!["399"])
        .penalty(PenaltyOption::ExcludePenalties)
        .home_or_away(HomeAwayOption::Either)
        .sort(SortOption::Goals)
        .scope(StatScope::Season)
        .subs_only(true)
        .earliest_sub_on_time(45)
        .build_query();

    test_search(
        BASE_SEARCH_URL,
        query.as_str(),
        50,
        PlayerSearchResult::new(
            1, 131505, String::from("Rodrigo"), Country::Spain,
            String::from("es"), PlayerSubPosition::CentreForward,
            String::from("https://img.a.transfermarkt.technology/portrait/header/131505-1686816509.jpg?lm=1"),
            10, 10, 3, 0,
            1, 0, 245, String::from("399"), 81,
            0, 81, 245, 0, 2020)).await;
}