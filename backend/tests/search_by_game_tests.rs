use chrono::NaiveDate;
use football_game::competitions::Competition;
use football_game::countries::Country;
use football_game::services::player::models::{HomeAwayOption, PenaltyOption, SortOption};
use football_game::services::player::player_enums::PlayerSubPosition;
use football_game::services::player::sql_models::PlayerGameSearchResult;
use crate::common::{test_search, SearchParamsBuilder};

pub mod common;

const BASE_GAME_URL: &str = "/search/game?";

#[actix_web::test]
async fn most_goals_in_premier_league_first_half_of_a_game() {
    let query = SearchParamsBuilder::new()
        .page(0)
        .limit(50)
        .seasons(vec![2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009,
        2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021,
        2022, 2023, 2024])
        .competitions(vec![Competition::PremierLeague])
        .minute_played_from(1)
        .minute_played_to(46)
        .minimum_age(14)
        .maximum_age(40)
        .minimum_height(131)
        .maximum_height(192)
        .penalty(PenaltyOption::IncludePenalties)
        .home_or_away(HomeAwayOption::Either)
        .sort(SortOption::Goals)
        .build_query();

    test_search(
        BASE_GAME_URL,
        query.as_str(),
        50,
        PlayerGameSearchResult::new(
            1, 568177, String::from("Cole Palmer"), Country::England,
            String::from("gb-eng"), PlayerSubPosition::AttackingMidfield,
            String::from("https://img.a.transfermarkt.technology/portrait/header/568177-1712320986.jpg?lm=1"),
            631, "GB1".to_string(), Competition::PremierLeague, String::from("gb-eng"),
            NaiveDate::from_ymd_opt(2024, 09, 28).unwrap(), 2024, 631,
            String::from("Chelsea Football Club"), 4, 1237,
            String::from("Brighton and Hove Albion Football Club"), 2,
            46, 4, 0)
    ).await;
}

#[actix_web::test]
async fn test_search_by_game() {
    let query = SearchParamsBuilder::new()
        .seasons(vec![2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013,
        2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024])
        .competitions(vec![Competition::PremierLeague, Competition::LaLiga, Competition::SerieA])
        .maximum_age(18)
        .minimum_height(131)
        .maximum_height(192)
        .penalty(PenaltyOption::ExcludePenalties)
        .home_or_away(HomeAwayOption::Either)
        .sort(SortOption::Assists)
        .build_query();

    test_search(
        BASE_GAME_URL,
        query.as_str(),
        50,
        PlayerGameSearchResult::new(
            1, 44675, String::from("Bojan Krkic"), Country::Spain,
            String::from("es"), PlayerSubPosition::SecondStriker,
            String::from("https://img.a.transfermarkt.technology/portrait/header/44675-1583613429.jpg?lm=1"),
            131, String::from("ES1"), Competition::LaLiga, String::from("es"),
            NaiveDate::from_ymd_opt(2008, 03, 23).unwrap(), 2007, 131,
            String::from("FC Barcelona"), 4, 366,
            String::from("Real Valladolid CF"), 1,
            86, 2, 2)
    ).await;
}

