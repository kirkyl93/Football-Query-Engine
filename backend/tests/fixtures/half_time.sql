-- Half-time substitutions use minute 46 in the source, with 45 minutes played.
BEGIN;
-- Keep this pack separate from existing competition-wide baseline assertions.
INSERT INTO public.competitions (competition_id, name, country_name, type)
VALUES ('FR1', 'Ligue 1', 'France', 'domestic_league');
INSERT INTO public.players
    (player_id, name, player_code, country_of_citizenship, sub_position, height_in_cm, date_of_birth, current_club_id, image_url)
VALUES
    (11, 'Harper Half', 'harper-half', 'England', 'Centre-Forward', 180, '1990-01-01', 301, 'https://example.invalid/player-11.png'),
    (12, 'Francis First', 'francis-first', 'England', 'Centre-Forward', 180, '1990-01-01', 301, 'https://example.invalid/player-12.png');
INSERT INTO public.games
    (game_id, competition_id, season, date, home_club_id, away_club_id, home_club_name, away_club_name, home_club_goals, away_club_goals)
VALUES (10, 'FR1', 2024, '2024-12-01', 301, 302, 'Leeds Grove', 'Lee Harbour', 1, 0);
INSERT INTO public.appearances
    (appearance_id, game_id, player_id, player_club_id, player_current_club_id, date, player_name, competition_id, yellow_cards, red_cards, goals, assists, minutes_played)
VALUES
    ('10-11', 10, 11, 301, 301, '2024-12-01', 'Harper Half', 'FR1', 0, 0, 1, 0, 45),
    ('10-12', 10, 12, 301, 301, '2024-12-01', 'Francis First', 'FR1', 0, 0, 0, 0, 45);
INSERT INTO public.game_events
    (game_event_id, date, game_id, minute, type, club_id, player_id, description, player_in_id, player_assist_id)
VALUES
    ('g10-sub', '2024-12-01', 10, 46, 'Substitutions', 301, 12, 'Half-time substitution', 11, NULL),
    ('g10-goal', '2024-12-01', 10, 46, 'Goals', 301, 11, 'Open-play goal', NULL, NULL);
COMMIT;
