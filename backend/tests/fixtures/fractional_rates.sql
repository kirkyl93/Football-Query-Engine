-- Fractional rates that integer division would incorrectly tie.
-- Isolated Bundesliga players keep the existing competition baselines unchanged.
BEGIN;
INSERT INTO public.competitions (competition_id, name, country_name, type)
VALUES ('L1', 'Bundesliga', 'Germany', 'domestic_league');
INSERT INTO public.players
    (player_id, name, player_code, country_of_citizenship, sub_position, height_in_cm, date_of_birth, current_club_id, image_url)
VALUES
    (16, 'Avery Ratio', 'avery-ratio', 'Germany', 'Centre-Forward', 180, '1990-01-01', 301, 'https://example.invalid/player-16.png'),
    (17, 'Zane Ratio', 'zane-ratio', 'Germany', 'Centre-Forward', 180, '1990-01-01', 301, 'https://example.invalid/player-17.png'),
    (18, 'Zero Ratio', 'zero-ratio', 'Germany', 'Centre-Forward', 180, '1990-01-01', 301, 'https://example.invalid/player-18.png');
INSERT INTO public.games
    (game_id, competition_id, season, date, home_club_id, away_club_id, home_club_name, away_club_name, home_club_goals, away_club_goals)
VALUES
    (12, 'L1', 2024, '2024-12-15', 301, 302, 'Leeds Grove', 'Lee Harbour', 2, 0),
    (13, 'L1', 2024, '2024-12-22', 301, 302, 'Leeds Grove', 'Lee Harbour', 2, 0),
    (14, 'L1', 2024, '2024-12-29', 301, 302, 'Leeds Grove', 'Lee Harbour', 2, 0);
INSERT INTO public.appearances
    (appearance_id, game_id, player_id, player_club_id, player_current_club_id, date, player_name, competition_id, yellow_cards, red_cards, goals, assists, minutes_played)
VALUES
    ('12-16', 12, 16, 301, 301, '2024-12-15', 'Avery Ratio', 'L1', 1, 1, 1, 1, 34),
    ('12-17', 12, 17, 301, 301, '2024-12-15', 'Zane Ratio', 'L1', 1, 1, 1, 1, 34),
    ('12-18', 12, 18, 301, 301, '2024-12-15', 'Zero Ratio', 'L1', 0, 0, 0, 0, 90),
    ('13-16', 13, 16, 301, 301, '2024-12-22', 'Avery Ratio', 'L1', 1, 1, 1, 1, 34),
    ('13-17', 13, 17, 301, 301, '2024-12-22', 'Zane Ratio', 'L1', 1, 1, 1, 1, 33),
    ('13-18', 13, 18, 301, 301, '2024-12-22', 'Zero Ratio', 'L1', 0, 0, 0, 0, 90),
    ('14-16', 14, 16, 301, 301, '2024-12-29', 'Avery Ratio', 'L1', 1, 1, 1, 1, 33),
    ('14-17', 14, 17, 301, 301, '2024-12-29', 'Zane Ratio', 'L1', 1, 1, 1, 1, 33),
    ('14-18', 14, 18, 301, 301, '2024-12-29', 'Zero Ratio', 'L1', 0, 0, 0, 0, 90);
INSERT INTO public.game_events
    (game_event_id, date, game_id, minute, type, club_id, player_id, description, player_in_id, player_assist_id)
VALUES
    ('g12-goal-16', '2024-12-15', 12, 10, 'Goals', 301, 16, 'Open-play goal', NULL, 17),
    ('g12-yellow-16', '2024-12-15', 12, 25, 'Cards', 301, 16, 'Yellow card', NULL, NULL),
    ('g12-red-16', '2024-12-15', 12, 34, 'Cards', 301, 16, 'Red card', NULL, NULL),
    ('g12-goal-17', '2024-12-15', 12, 20, 'Goals', 301, 17, 'Open-play goal', NULL, 16),
    ('g12-yellow-17', '2024-12-15', 12, 25, 'Cards', 301, 17, 'Yellow card', NULL, NULL),
    ('g12-red-17', '2024-12-15', 12, 34, 'Cards', 301, 17, 'Red card', NULL, NULL),
    ('g13-goal-16', '2024-12-22', 13, 10, 'Goals', 301, 16, 'Open-play goal', NULL, 17),
    ('g13-yellow-16', '2024-12-22', 13, 25, 'Cards', 301, 16, 'Yellow card', NULL, NULL),
    ('g13-red-16', '2024-12-22', 13, 34, 'Cards', 301, 16, 'Red card', NULL, NULL),
    ('g13-goal-17', '2024-12-22', 13, 20, 'Goals', 301, 17, 'Open-play goal', NULL, 16),
    ('g13-yellow-17', '2024-12-22', 13, 25, 'Cards', 301, 17, 'Yellow card', NULL, NULL),
    ('g13-red-17', '2024-12-22', 13, 33, 'Cards', 301, 17, 'Red card', NULL, NULL),
    ('g14-goal-16', '2024-12-29', 14, 10, 'Goals', 301, 16, 'Open-play goal', NULL, 17),
    ('g14-yellow-16', '2024-12-29', 14, 25, 'Cards', 301, 16, 'Yellow card', NULL, NULL),
    ('g14-red-16', '2024-12-29', 14, 33, 'Cards', 301, 16, 'Red card', NULL, NULL),
    ('g14-goal-17', '2024-12-29', 14, 20, 'Goals', 301, 17, 'Open-play goal', NULL, 16),
    ('g14-yellow-17', '2024-12-29', 14, 25, 'Cards', 301, 17, 'Yellow card', NULL, NULL),
    ('g14-red-17', '2024-12-29', 14, 33, 'Cards', 301, 17, 'Red card', NULL, NULL);
COMMIT;
