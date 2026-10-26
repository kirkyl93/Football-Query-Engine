-- Shared synthetic football fixture. See README.md for the event ledger and conventions.
-- Apply the real root dbschema.sql to a NEW database first; this seed never truncates data.
BEGIN;
DO $$ BEGIN
    IF current_database() NOT LIKE '%\_test' ESCAPE '\' THEN
        RAISE EXCEPTION 'Fixtures require a dedicated database whose name ends in _test';
    END IF;
END $$;

INSERT INTO public.clubs (club_id, name, club_code, stadium_seats) VALUES
    (101, 'Northbridge FC', 'northbridge-fc', 30000),
    (102, 'Riverside FC', 'riverside-fc', 25000),
    (103, 'Hilltown FC', 'hilltown-fc', 15000),
    (301, 'Leeds Grove', 'leeds-grove', 20000),
    (302, 'Lee Harbour', 'lee-harbour', 10000);
INSERT INTO public.competitions (competition_id, name, country_name, type) VALUES
    ('GB1', 'Premier League', 'England', 'domestic_league'),
    ('CL', 'UEFA Champions League', 'Europe', 'international_cup'),
    ('ES1', 'La Liga', 'Spain', 'domestic_league');
INSERT INTO public.players (player_id, name, player_code, country_of_citizenship, sub_position, height_in_cm, date_of_birth, current_club_id, image_url) VALUES
    (1, 'Alex Striker', 'alex-striker', 'England', 'Centre-Forward', 180, '2006-08-17', 102, 'https://example.invalid/player-1.png'),
    (2, 'Jamie Creator', 'jamie-creator', 'Spain', 'Central Midfield', 175, '2000-02-01', 101, 'https://example.invalid/player-2.png'),
    (3, 'Sam Defender', 'sam-defender', 'England', 'Centre-Back', 190, '1990-01-01', 101, 'https://example.invalid/player-3.png'),
    (4, 'David Finch', 'david-finch', 'Togo', 'Centre-Forward', 185, '1995-01-01', 103, 'https://example.invalid/player-4.png'),
    (5, 'David Vale', 'david-vale', 'Australia', 'Centre-Forward', 185, '1995-01-01', 103, 'https://example.invalid/player-5.png'),
    (6, 'Pat Forward', 'pat-forward', 'France', 'Centre-Forward', 180, '2002-01-01', 103, 'https://example.invalid/player-6.png');
INSERT INTO public.games (game_id, competition_id, season, date, home_club_id, away_club_id, home_club_name, away_club_name, home_club_goals, away_club_goals) VALUES
    (1, 'GB1', 2024, '2024-08-10', 101, 102, 'Northbridge FC', 'Riverside FC', 3, 1),
    (2, 'GB1', 2024, '2024-08-17', 102, 101, 'Riverside FC', 'Northbridge FC', 2, 2),
    (3, 'GB1', 2024, '2024-09-07', 101, 103, 'Northbridge FC', 'Hilltown FC', 3, 2),
    (4, 'GB1', 2025, '2025-08-10', 103, 101, 'Hilltown FC', 'Northbridge FC', 1, 1),
    (5, 'GB1', 2025, '2025-08-17', 101, 102, 'Northbridge FC', 'Riverside FC', 1, 2),
    (6, 'CL', 2024, '2024-10-01', 101, 103, 'Northbridge FC', 'Hilltown FC', 4, 2),
    (7, 'ES1', 2024, '2024-08-24', 301, 302, 'Leeds Grove', 'Lee Harbour', 3, 0);

-- G1: Northbridge FC vs Riverside FC, 2024-08-10.
INSERT INTO public.appearances (appearance_id, game_id, player_id, player_club_id, player_current_club_id, date, player_name, competition_id, yellow_cards, red_cards, goals, assists, minutes_played) VALUES
    ('1-1', 1, 1, 101, 102, '2024-08-10', 'Alex Striker', 'GB1', 0, 0, 2, 1, 90),
    ('1-2', 1, 2, 101, 101, '2024-08-10', 'Jamie Creator', 'GB1', 0, 0, 1, 1, 90),
    ('1-3', 1, 3, 101, 101, '2024-08-10', 'Sam Defender', 'GB1', 2, 0, 0, 0, 80),
    ('1-4', 1, 4, 102, 103, '2024-08-10', 'David Finch', 'GB1', 1, 0, 1, 0, 90);
INSERT INTO public.game_events (game_event_id, date, game_id, minute, type, club_id, player_id, description, player_in_id, player_assist_id) VALUES
    ('g1-goal-1', '2024-08-10', 1, 10, 'Goals', 101, 1, 'Open-play goal', NULL, 2),
    ('g1-goal-2', '2024-08-10', 1, 45, 'Goals', 101, 1, 'Penalty', NULL, NULL),
    ('g1-goal-3', '2024-08-10', 1, 46, 'Goals', 101, 2, 'Open-play goal', NULL, 1),
    ('g1-goal-4', '2024-08-10', 1, 85, 'Goals', 102, 4, 'Open-play goal', NULL, NULL),
    ('g1-card-1', '2024-08-10', 1, 20, 'Cards', 101, 3, 'Yellow card', NULL, NULL),
    ('g1-card-2', '2024-08-10', 1, 80, 'Cards', 101, 3, 'Yellow card', NULL, NULL),
    ('g1-card-3', '2024-08-10', 1, 30, 'Cards', 102, 4, 'Yellow card', NULL, NULL);

-- G2: Riverside FC vs Northbridge FC, 2024-08-17.
INSERT INTO public.appearances (appearance_id, game_id, player_id, player_club_id, player_current_club_id, date, player_name, competition_id, yellow_cards, red_cards, goals, assists, minutes_played) VALUES
    ('2-1', 2, 1, 101, 102, '2024-08-17', 'Alex Striker', 'GB1', 0, 0, 0, 1, 90),
    ('2-2', 2, 2, 101, 101, '2024-08-17', 'Jamie Creator', 'GB1', 0, 0, 2, 0, 90),
    ('2-3', 2, 3, 101, 101, '2024-08-17', 'Sam Defender', 'GB1', 0, 1, 0, 0, 60),
    ('2-4', 2, 4, 102, 103, '2024-08-17', 'David Finch', 'GB1', 0, 0, 2, 0, 90);
INSERT INTO public.game_events (game_event_id, date, game_id, minute, type, club_id, player_id, description, player_in_id, player_assist_id) VALUES
    ('g2-goal-1', '2024-08-17', 2, 15, 'Goals', 102, 4, 'Open-play goal', NULL, NULL),
    ('g2-goal-2', '2024-08-17', 2, 77, 'Goals', 101, 2, 'Open-play goal', NULL, 1),
    ('g2-goal-3', '2024-08-17', 2, 78, 'Goals', 102, 4, 'Penalty', NULL, NULL),
    ('g2-goal-4', '2024-08-17', 2, 90, 'Goals', 101, 2, 'Open-play goal', NULL, NULL),
    ('g2-card-1', '2024-08-17', 2, 60, 'Cards', 101, 3, 'Red card', NULL, NULL);

-- G3: Northbridge FC vs Hilltown FC, 2024-09-07.
INSERT INTO public.appearances (appearance_id, game_id, player_id, player_club_id, player_current_club_id, date, player_name, competition_id, yellow_cards, red_cards, goals, assists, minutes_played) VALUES
    ('3-1', 3, 1, 101, 102, '2024-09-07', 'Alex Striker', 'GB1', 0, 0, 2, 0, 90),
    ('3-2', 3, 2, 101, 101, '2024-09-07', 'Jamie Creator', 'GB1', 0, 0, 0, 2, 90),
    ('3-3', 3, 3, 101, 101, '2024-09-07', 'Sam Defender', 'GB1', 1, 0, 1, 0, 90),
    ('3-5', 3, 5, 103, 103, '2024-09-07', 'David Vale', 'GB1', 0, 0, 2, 0, 30),
    ('3-6', 3, 6, 103, 103, '2024-09-07', 'Pat Forward', 'GB1', 0, 0, 0, 0, 60);
INSERT INTO public.game_events (game_event_id, date, game_id, minute, type, club_id, player_id, description, player_in_id, player_assist_id) VALUES
    ('g3-goal-1', '2024-09-07', 3, 2, 'Goals', 101, 3, 'Open-play goal', NULL, NULL),
    ('g3-goal-2', '2024-09-07', 3, 46, 'Goals', 101, 1, 'Open-play goal', NULL, 2),
    ('g3-goal-3', '2024-09-07', 3, 85, 'Goals', 101, 1, 'Open-play goal', NULL, 2),
    ('g3-goal-4', '2024-09-07', 3, 60, 'Goals', 103, 5, 'Open-play goal', NULL, NULL),
    ('g3-goal-5', '2024-09-07', 3, 88, 'Goals', 103, 5, 'Open-play goal', NULL, NULL),
    ('g3-card-1', '2024-09-07', 3, 10, 'Cards', 101, 3, 'Yellow card', NULL, NULL),
    ('g3-sub', '2024-09-07', 3, 60, 'Substitutions', 103, 6, 'Substitution', 5, NULL);

-- G4: Hilltown FC vs Northbridge FC, 2025-08-10.
INSERT INTO public.appearances (appearance_id, game_id, player_id, player_club_id, player_current_club_id, date, player_name, competition_id, yellow_cards, red_cards, goals, assists, minutes_played) VALUES
    ('4-1', 4, 1, 101, 102, '2025-08-10', 'Alex Striker', 'GB1', 0, 0, 1, 0, 90),
    ('4-2', 4, 2, 101, 101, '2025-08-10', 'Jamie Creator', 'GB1', 0, 0, 0, 1, 90),
    ('4-3', 4, 3, 101, 101, '2025-08-10', 'Sam Defender', 'GB1', 0, 0, 0, 0, 90),
    ('4-4', 4, 4, 103, 103, '2025-08-10', 'David Finch', 'GB1', 0, 0, 1, 0, 90),
    ('4-5', 4, 5, 103, 103, '2025-08-10', 'David Vale', 'GB1', 2, 0, 0, 0, 46);
INSERT INTO public.game_events (game_event_id, date, game_id, minute, type, club_id, player_id, description, player_in_id, player_assist_id) VALUES
    ('g4-goal-1', '2025-08-10', 4, 15, 'Goals', 101, 1, 'Open-play goal', NULL, 2),
    ('g4-goal-2', '2025-08-10', 4, 20, 'Goals', 103, 4, 'Open-play goal', NULL, NULL),
    ('g4-card-1', '2025-08-10', 4, 45, 'Cards', 103, 5, 'Yellow card', NULL, NULL),
    ('g4-card-2', '2025-08-10', 4, 46, 'Cards', 103, 5, 'Yellow card', NULL, NULL);

-- G5: Northbridge FC vs Riverside FC, 2025-08-17.
INSERT INTO public.appearances (appearance_id, game_id, player_id, player_club_id, player_current_club_id, date, player_name, competition_id, yellow_cards, red_cards, goals, assists, minutes_played) VALUES
    ('5-1', 5, 1, 102, 102, '2025-08-17', 'Alex Striker', 'GB1', 0, 0, 2, 0, 90),
    ('5-2', 5, 2, 101, 101, '2025-08-17', 'Jamie Creator', 'GB1', 0, 0, 1, 0, 90),
    ('5-3', 5, 3, 101, 101, '2025-08-17', 'Sam Defender', 'GB1', 0, 0, 0, 0, 90);
INSERT INTO public.game_events (game_event_id, date, game_id, minute, type, club_id, player_id, description, player_in_id, player_assist_id) VALUES
    ('g5-goal-1', '2025-08-17', 5, 10, 'Goals', 102, 1, 'Open-play goal', NULL, NULL),
    ('g5-goal-2', '2025-08-17', 5, 88, 'Goals', 102, 1, 'Penalty', NULL, NULL),
    ('g5-goal-3', '2025-08-17', 5, 45, 'Goals', 101, 2, 'Open-play goal', NULL, NULL);

-- G6: Northbridge FC vs Hilltown FC, 2024-10-01.
INSERT INTO public.appearances (appearance_id, game_id, player_id, player_club_id, player_current_club_id, date, player_name, competition_id, yellow_cards, red_cards, goals, assists, minutes_played) VALUES
    ('6-1', 6, 1, 101, 102, '2024-10-01', 'Alex Striker', 'CL', 0, 0, 4, 0, 90),
    ('6-2', 6, 2, 101, 101, '2024-10-01', 'Jamie Creator', 'CL', 0, 0, 0, 3, 90),
    ('6-3', 6, 3, 101, 101, '2024-10-01', 'Sam Defender', 'CL', 0, 0, 0, 0, 90),
    ('6-5', 6, 5, 103, 103, '2024-10-01', 'David Vale', 'CL', 0, 0, 1, 1, 45),
    ('6-6', 6, 6, 103, 103, '2024-10-01', 'Pat Forward', 'CL', 0, 0, 1, 0, 45);
INSERT INTO public.game_events (game_event_id, date, game_id, minute, type, club_id, player_id, description, player_in_id, player_assist_id) VALUES
    ('g6-goal-1', '2024-10-01', 6, 10, 'Goals', 101, 1, 'Open-play goal', NULL, 2),
    ('g6-goal-2', '2024-10-01', 6, 45, 'Goals', 101, 1, 'Penalty', NULL, NULL),
    ('g6-goal-3', '2024-10-01', 6, 46, 'Goals', 101, 1, 'Open-play goal', NULL, 2),
    ('g6-goal-4', '2024-10-01', 6, 85, 'Goals', 101, 1, 'Open-play goal', NULL, 2),
    ('g6-goal-5', '2024-10-01', 6, 45, 'Goals', 103, 6, 'Open-play goal', NULL, 5),
    ('g6-goal-6', '2024-10-01', 6, 88, 'Goals', 103, 5, 'Penalty', NULL, NULL),
    ('g6-sub', '2024-10-01', 6, 45, 'Substitutions', 103, 6, 'Substitution', 5, NULL);

-- G7: Leeds Grove vs Lee Harbour, 2024-08-24.
INSERT INTO public.appearances (appearance_id, game_id, player_id, player_club_id, player_current_club_id, date, player_name, competition_id, yellow_cards, red_cards, goals, assists, minutes_played) VALUES
    ('7-5', 7, 5, 301, 103, '2024-08-24', 'David Vale', 'ES1', 0, 0, 0, 3, 90),
    ('7-6', 7, 6, 301, 103, '2024-08-24', 'Pat Forward', 'ES1', 0, 0, 3, 0, 90);
INSERT INTO public.game_events (game_event_id, date, game_id, minute, type, club_id, player_id, description, player_in_id, player_assist_id) VALUES
    ('g7-goal-1', '2024-08-24', 7, 15, 'Goals', 301, 6, 'Open-play goal', NULL, 5),
    ('g7-goal-2', '2024-08-24', 7, 45, 'Goals', 301, 6, 'Open-play goal', NULL, 5),
    ('g7-goal-3', '2024-08-24', 7, 85, 'Goals', 301, 6, 'Open-play goal', NULL, 5);

REFRESH MATERIALIZED VIEW public.appearances_enhanced;
REFRESH MATERIALIZED VIEW public.appearances_with_event_times;
COMMIT;
