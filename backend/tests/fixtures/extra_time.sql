-- Extra-time scenarios are separate from the GB1 baseline. All events are
-- explicit integer timestamps; this pack makes no assumption about 90+N data.
BEGIN;

INSERT INTO public.players
    (player_id, name, player_code, country_of_citizenship, sub_position, height_in_cm, date_of_birth, current_club_id, image_url)
VALUES
    (7, 'Terry Timer', 'terry-timer', 'England', 'Centre-Forward', 180, '1990-01-01', 302, 'https://example.invalid/player-7.png'),
    (8, 'Nora Ninety', 'nora-ninety', 'Spain', 'Central Midfield', 175, '1990-01-01', 301, 'https://example.invalid/player-8.png'),
    (9, 'Owen Outgoing', 'owen-outgoing', 'England', 'Centre-Forward', 180, '1990-01-01', 302, 'https://example.invalid/player-9.png'),
    (10, 'Quinn Late', 'quinn-late', 'Australia', 'Centre-Forward', 185, '1990-01-01', 302, 'https://example.invalid/player-10.png');

INSERT INTO public.games
    (game_id, competition_id, season, date, home_club_id, away_club_id, home_club_name, away_club_name, home_club_goals, away_club_goals)
VALUES
    (8, 'CL', 2024, '2024-11-01', 301, 302, 'Leeds Grove', 'Lee Harbour', 4, 0),
    (9, 'CL', 2024, '2024-11-08', 302, 301, 'Lee Harbour', 'Leeds Grove', 5, 0);

-- G8: Terry plays 120. Nora replaces Owen at 90 and plays 30.
INSERT INTO public.appearances
    (appearance_id, game_id, player_id, player_club_id, player_current_club_id, date, player_name, competition_id, yellow_cards, red_cards, goals, assists, minutes_played)
VALUES
    ('8-7', 8, 7, 301, 302, '2024-11-01', 'Terry Timer', 'CL', 1, 0, 3, 0, 120),
    ('8-8', 8, 8, 301, 301, '2024-11-01', 'Nora Ninety', 'CL', 0, 0, 1, 1, 30),
    ('8-9', 8, 9, 301, 302, '2024-11-01', 'Owen Outgoing', 'CL', 0, 0, 0, 0, 90);

INSERT INTO public.game_events
    (game_event_id, date, game_id, minute, type, club_id, player_id, description, player_in_id, player_assist_id)
VALUES
    ('g8-goal-1', '2024-11-01', 8, 90, 'Goals', 301, 7, 'Open-play goal', NULL, NULL),
    ('g8-goal-2', '2024-11-01', 8, 91, 'Goals', 301, 8, 'Open-play goal', NULL, NULL),
    ('g8-goal-3', '2024-11-01', 8, 105, 'Goals', 301, 7, 'Open-play goal', NULL, 8),
    ('g8-goal-4', '2024-11-01', 8, 120, 'Goals', 301, 7, 'Open-play goal', NULL, NULL),
    ('g8-yellow-1', '2024-11-01', 8, 105, 'Cards', 301, 7, 'Yellow card', NULL, NULL),
    ('g8-sub', '2024-11-01', 8, 90, 'Substitutions', 301, 9, 'Substitution', 8, NULL);

-- G9: Terry again plays 120. Quinn replaces Owen at 105, scores in that
-- same minute, assists at 106, and scores a penalty at 120. Terry's second
-- yellow is at 120; raw appearance reds exclude double-yellow dismissals.
INSERT INTO public.appearances
    (appearance_id, game_id, player_id, player_club_id, player_current_club_id, date, player_name, competition_id, yellow_cards, red_cards, goals, assists, minutes_played)
VALUES
    ('9-7', 9, 7, 302, 302, '2024-11-08', 'Terry Timer', 'CL', 2, 0, 2, 0, 120),
    ('9-9', 9, 9, 302, 302, '2024-11-08', 'Owen Outgoing', 'CL', 0, 0, 1, 1, 105),
    ('9-10', 9, 10, 302, 302, '2024-11-08', 'Quinn Late', 'CL', 0, 0, 2, 1, 15);

INSERT INTO public.game_events
    (game_event_id, date, game_id, minute, type, club_id, player_id, description, player_in_id, player_assist_id)
VALUES
    ('g9-goal-1', '2024-11-08', 9, 105, 'Goals', 302, 9, 'Open-play goal', NULL, NULL),
    ('g9-goal-2', '2024-11-08', 9, 105, 'Goals', 302, 10, 'Open-play goal', NULL, 9),
    ('g9-goal-3', '2024-11-08', 9, 106, 'Goals', 302, 7, 'Open-play goal', NULL, 10),
    ('g9-goal-4', '2024-11-08', 9, 120, 'Goals', 302, 7, 'Open-play goal', NULL, NULL),
    ('g9-goal-5', '2024-11-08', 9, 120, 'Goals', 302, 10, 'Penalty', NULL, NULL),
    ('g9-yellow-1', '2024-11-08', 9, 106, 'Cards', 302, 7, 'Yellow card', NULL, NULL),
    ('g9-yellow-2', '2024-11-08', 9, 120, 'Cards', 302, 7, 'Yellow card', NULL, NULL),
    ('g9-sub', '2024-11-08', 9, 105, 'Substitutions', 302, 9, 'Substitution', 10, NULL);

REFRESH MATERIALIZED VIEW public.appearances_enhanced;
REFRESH MATERIALIZED VIEW public.appearances_with_event_times;
COMMIT;
