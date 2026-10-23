export const exampleQueries = [
    {label: "Height, match time & scoring rate", query: "Players under 173cm with the fewest minutes per goal or assist in the second half of Premier League games, with at least 50 appearances"},
    {label: "Hat-tricks across leagues", query: "Who has the most hat-tricks across the Premier League and Bundesliga, excluding penalties?"},
    {label: "Seasons with goals & assists", query: "Which players have the most La Liga seasons with at least 20 goals and 10 assists?"},
    {label: "Englishmen in Italy", query: "Most away goals scored by an Englishman in Serie A after the 84th minute"},
    {label: "Late goals from defenders", query: "Which centre-backs have scored the most Premier League goals after the 80th minute?"},
    {label: "Teenage creators", query: "Most away assists in the Bundesliga recorded before a player's 20th birthday"},
    {label: "Scoring after 35", query: "Most non-penalty Champions League goals scored at age 35 or older"},
    {label: "Yellow cards per minute", query: "Which central midfielders have the fewest minutes per yellow card in La Liga, with at least 50 appearances?"},
    {label: "Goals without penalties", query: "French players with the most non-penalty goals across the Premier League and Serie A"},
    {label: "Short players, big numbers", query: "Players under 170cm with the most away goals and assists combined in the Champions League"},
    {label: "Prolific individual seasons", query: "Show individual Premier League player-seasons ranked by non-penalty goals scored at age 30 or older"},
    {label: "Regular German assist makers", query: "German players with the most Bundesliga seasons with at least 10 assists"},
    {label: "Two goals away from home", query: "Who has the most away games with at least two goals in Serie A?"},
    {label: "Goals and assists in one game", query: "Who has the most Premier League games with at least one goal and one assist?"},
    {label: "Penalties away from home", query: "Which Spanish players have scored the most penalties away from home in La Liga?"},
    {label: "First-half scoring rate", query: "Fewest minutes per goal in the first half of Bundesliga games, excluding penalties, with at least 50 appearances"},
    {label: "Spanish scorers abroad", query: "Spanish players with the most second-half league goals outside La Liga, excluding penalties"},
    {label: "Young South American creators", query: "South American players with the most away assists in Ligue 1 recorded before their 23rd birthday"},
    {label: "Red cards per minute", query: "Which centre-backs have the fewest minutes per red card in Serie A, with at least 100 appearances?"},
    {label: "Twenty-goal seasons", query: "Who has the most seasons with at least 20 non-penalty goals across the Premier League and Bundesliga?"},
] as const;

/** Sample without replacement; copy the pool so future visits can use it again. */
export function selectExampleQueries(random: () => number = Math.random) {
    const pool = [...exampleQueries];
    for (let index = 0; index < 3; index++) {
        const pick = index + Math.floor(random() * (pool.length - index));
        [pool[index], pool[pick]] = [pool[pick], pool[index]];
    }
    return pool.slice(0, 3);
}
