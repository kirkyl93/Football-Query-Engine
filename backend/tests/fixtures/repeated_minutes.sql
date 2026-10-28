-- Repeated integer timestamps represent distinct events, as with collapsed 90+N times.
-- A separate competition/player set keeps existing search baselines unchanged.
BEGIN;
INSERT INTO public.competitions (competition_id, name, country_name, type)
VALUES ('IT1', 'Serie A', 'Italy', 'domestic_league');
INSERT INTO public.players
    (player_id, name, player_code, country_of_citizenship, sub_position, height_in_cm, date_of_birth, current_club_id, image_url)
VALUES
    (13, 'Robin Repeat', 'robin-repeat', 'Italy', 'Centre-Forward', 180, '1990-01-01', 301, 'https://example.invalid/player-13.png'),
    (14, 'Casey Creator', 'casey-creator', 'Italy', 'Central Midfield', 175, '1990-01-01', 301, 'https://example.invalid/player-14.png'),
    (15, 'Lee Late', 'lee-late', 'Italy', 'Centre-Forward', 180, '1990-01-01', 301, 'https://example.invalid/player-15.png');
INSERT INTO public.games
    (game_id, competition_id, season, date, home_club_id, away_club_id, home_club_name, away_club_name, home_club_goals, away_club_goals)
VALUES (11, 'IT1', 2024, '2024-12-08', 301, 302, 'Leeds Grove', 'Lee Harbour', 8, 2);
INSERT INTO public.appearances
    (appearance_id, game_id, player_id, player_club_id, player_current_club_id, date, player_name, competition_id, yellow_cards, red_cards, goals, assists, minutes_played)
VALUES
    ('11-13', 11, 13, 301, 301, '2024-12-08', 'Robin Repeat', 'IT1', 2, 2, 5, 3, 90),
    ('11-14', 11, 14, 301, 301, '2024-12-08', 'Casey Creator', 'IT1', 0, 0, 3, 0, 90),
    ('11-15', 11, 15, 301, 301, '2024-12-08', 'Lee Late', 'IT1', 0, 0, 0, 0, 1);
-- All categories coexist to catch multiplication across joins as well as DISTINCT
-- collapsing timestamps. Two red records are deliberately synthetic stress data.
INSERT INTO public.game_events
    (game_event_id, date, game_id, minute, type, club_id, player_id, description, player_in_id, player_assist_id)
VALUES
    ('g11-goal-1', '2024-12-08', 11, 90, 'Goals', 301, 13, 'Open-play goal', NULL, NULL),
    ('g11-goal-2', '2024-12-08', 11, 90, 'Goals', 301, 13, 'Open-play goal', NULL, NULL),
    ('g11-goal-3', '2024-12-08', 11, 10, 'Goals', 301, 13, 'Open-play goal', NULL, NULL),
    ('g11-penalty-1', '2024-12-08', 11, 90, 'Goals', 301, 13, 'Penalty', NULL, NULL),
    ('g11-penalty-2', '2024-12-08', 11, 90, 'Goals', 301, 13, 'Penalty', NULL, NULL),
    ('g11-own-1', '2024-12-08', 11, 90, 'Goals', 301, 13, 'Own-goal', NULL, NULL),
    ('g11-own-2', '2024-12-08', 11, 90, 'Goals', 301, 13, 'Own-goal', NULL, NULL),
    ('g11-assist-1', '2024-12-08', 11, 90, 'Goals', 301, 14, 'Open-play goal', NULL, 13),
    ('g11-assist-2', '2024-12-08', 11, 90, 'Goals', 301, 14, 'Open-play goal', NULL, 13),
    ('g11-assist-3', '2024-12-08', 11, 30, 'Goals', 301, 14, 'Open-play goal', NULL, 13),
    ('g11-yellow-1', '2024-12-08', 11, 90, 'Cards', 301, 13, 'Yellow card', NULL, NULL),
    ('g11-yellow-2', '2024-12-08', 11, 90, 'Cards', 301, 13, 'Yellow card', NULL, NULL),
    ('g11-red-1', '2024-12-08', 11, 90, 'Cards', 301, 13, 'Red card', NULL, NULL),
    ('g11-red-2', '2024-12-08', 11, 90, 'Cards', 301, 13, 'Red card', NULL, NULL),
    ('g11-sub', '2024-12-08', 11, 90, 'Substitutions', 301, 14, 'Substitution', 15, NULL);
COMMIT;
