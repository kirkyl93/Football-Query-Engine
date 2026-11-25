use super::{QuizError, QuizResult, search::PlayerRows};
use actix_web::http::StatusCode;
use serde::Deserialize;
use serde_json::json;
use std::collections::BTreeMap;

const LEVELS: [&str; 5] = [
    "Obvious early guess",
    "Easy to recall",
    "Moderately difficult",
    "Unlikely except for knowledgeable fans",
    "Very obscure for this question",
];

#[derive(Deserialize)]
struct ResultBatch {
    answers: BTreeMap<String, Answer>,
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
enum Answer {
    Score { score: f64 },
}

fn invalid() -> QuizError {
    QuizError(
        StatusCode::BAD_GATEWAY,
        "Jev did not return a valid rating for every player.",
    )
}

fn validated(batch: ResultBatch, names: impl Iterator<Item = String>) -> QuizResult<Vec<f64>> {
    let names: Vec<_> = names.collect();
    if names.len() != batch.answers.len() {
        return Err(invalid());
    }
    names
        .iter()
        .map(|key| match batch.answers.get(key) {
            Some(Answer::Score { score }) if (0.0..=4.0).contains(score) => Ok(*score),
            _ => Err(invalid()),
        })
        .collect()
}

fn rating_request(model: &str, question: &str, players: &[PlayerRows]) -> serde_json::Value {
    let questions: BTreeMap<_, _> = players.iter().map(|player| {
        let row = &player.rows[0];
        (format!("player_{}", player.id), json!({
            "type": "score",
            "instructions": format!(
                "Rate how hard it is for a regular football fan to guess {} ({}, {}) for this specific quiz question. The player is known to qualify. Evaluate recall, not football ability.",
                row["player_name"], row["country_code"], row["sub_position"]
            ),
            "criteria": LEVELS,
        }))
    }).collect();
    json!({"model":model,"state":{"quiz_question":question},"questions":questions})
}

pub(super) async fn rate(
    client: &reqwest::Client,
    api_key: &str,
    model: &str,
    question: &str,
    players: &[PlayerRows],
) -> QuizResult<Vec<f64>> {
    let unavailable = || {
        QuizError(
            StatusCode::BAD_GATEWAY,
            "Jev scoring failed. Check your TypeSafe account and try again.",
        )
    };
    let response = client
        .post("https://api.typesafe.ai/v1/systemone")
        .bearer_auth(api_key)
        .timeout(std::time::Duration::from_secs(30))
        .json(&rating_request(model, question, players))
        .send()
        .await
        .map_err(|_| unavailable())?;
    if !response.status().is_success() {
        log::warn!("Jev returned HTTP {}", response.status());
        return Err(unavailable());
    }
    let batch = response.json().await.map_err(|_| invalid())?;
    validated(
        batch,
        players.iter().map(|player| format!("player_{}", player.id)),
    )
}

pub(super) fn search_rank(player: &PlayerRows) -> QuizResult<i32> {
    player
        .rows
        .iter()
        .filter_map(|row| i32::try_from(row["rank"].as_i64()?).ok())
        .filter(|&rank| rank > 0)
        .min()
        .ok_or(QuizError(
            StatusCode::INTERNAL_SERVER_ERROR,
            "A quiz player is missing a valid search rank.",
        ))
}

const MIN_ANSWER_POINTS: i32 = 16;

pub(super) fn points(players: &[PlayerRows], ratings: &[f64]) -> QuizResult<Vec<i32>> {
    let search_ranks: Vec<_> = players.iter().map(search_rank).collect::<QuizResult<_>>()?;
    if players.len() != ratings.len() {
        return Err(invalid());
    }

    let mut order: Vec<_> = (0..players.len()).collect();
    order.sort_by(|&left, &right| {
        ratings[left]
            .total_cmp(&ratings[right])
            .then_with(|| search_ranks[left].cmp(&search_ranks[right]))
    });
    let mut combined: Vec<_> = search_ranks.iter().map(|&rank| i64::from(rank)).collect();
    for (position, &player) in order.iter().enumerate() {
        combined[player] += position as i64 + 1;
    }

    order.sort_unstable_by_key(|&player| (combined[player], search_ranks[player], player));
    let mut points = vec![0; players.len()];
    for (position, player) in order.into_iter().enumerate() {
        points[player] = position as i32 + MIN_ANSWER_POINTS;
    }
    Ok(points)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn combines_jev_and_search_ranks_and_returns_points_in_preview_order() {
        let players = [
            PlayerRows {
                id: 10,
                rows: vec![json!({"rank":6}), json!({"rank":1})],
            },
            PlayerRows {
                id: 20,
                rows: vec![json!({"rank":2})],
            },
            PlayerRows {
                id: 30,
                rows: vec![json!({"rank":3})],
            },
            PlayerRows {
                id: 40,
                rows: vec![json!({"rank":4})],
            },
        ];
        // Jev ranks 4, 3, 1, 2 yield combined ranks 5, 5, 4, 6.
        assert_eq!(
            points(&players, &[4.0, 3.0, 0.0, 0.0]).unwrap(),
            [17, 18, 16, 19]
        );
        assert!(points(&players, &[4.0]).is_err());
    }

    #[test]
    fn missing_search_rank_is_an_error_instead_of_using_preview_position() {
        let players = [PlayerRows {
            id: 10,
            rows: vec![json!({"player_name":"Example"})],
        }];

        assert_eq!(
            points(&players, &[2.0]).unwrap_err().0,
            StatusCode::INTERNAL_SERVER_ERROR
        );
    }

    #[test]
    fn rating_request_contains_every_distinct_player_in_one_batch() {
        let players: Vec<_> = (1..=60)
            .map(|id| PlayerRows {
                id,
                rows: vec![json!({"player_name":format!("Player {id}")}), json!({})],
            })
            .collect();
        let request = rating_request("jev-latest", "Which players qualify?", &players);
        assert_eq!(request["state"]["quiz_question"], "Which players qualify?");
        let questions = request["questions"].as_object().unwrap();
        assert_eq!(questions.len(), players.len());
        assert_eq!(questions["player_60"]["criteria"], json!(LEVELS));
    }

    #[test]
    fn requires_a_rating_per_player_and_rejects_invalid_values() {
        let decode = |score| {
            serde_json::from_value(json!({"answers":{"player_1":{"type":"score","score":score}}}))
                .unwrap()
        };
        assert_eq!(
            validated(decode(3.6), ["player_1".into()].into_iter()).unwrap(),
            vec![3.6]
        );
        assert!(validated(decode(5.0), ["player_1".into()].into_iter()).is_err());
        assert!(validated(decode(0.0), ["player_2".into()].into_iter()).is_err());
    }
}
