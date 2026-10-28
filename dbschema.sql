--
-- PostgreSQL database dump
--

\restrict ulKJfoafxPsFlK71K1qH9nEayfEyLg9hKklEgd57ZCRB1PiiFESvB3fBtypTgZp

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 219 (class 1259 OID 16385)
-- Name: appearances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appearances (
    appearance_id character varying(50) NOT NULL,
    game_id integer,
    player_id integer,
    player_club_id integer,
    player_current_club_id integer,
    date date,
    player_name character varying(200),
    competition_id character varying(10),
    yellow_cards integer,
    red_cards integer,
    goals integer,
    assists integer,
    minutes_played integer
);


--
-- TOC entry 220 (class 1259 OID 16389)
-- Name: game_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_events (
    game_event_id character varying(50) NOT NULL,
    date date,
    game_id integer,
    minute integer,
    type character varying(50),
    club_id integer,
    player_id integer,
    description text,
    player_in_id integer,
    player_assist_id integer,
    is_penalty boolean GENERATED ALWAYS AS (description ILIKE '%penalty%') STORED,
    is_yellow boolean GENERATED ALWAYS AS (description ILIKE '%yellow%') STORED,
    is_red boolean GENERATED ALWAYS AS (description ILIKE '%red%') STORED
);


--
-- TOC entry 221 (class 1259 OID 16395)
-- Name: appearances_enhanced; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.appearances_enhanced AS
 SELECT a.appearance_id,
    a.game_id,
    a.player_id,
    a.player_club_id,
    a.player_current_club_id,
    a.date,
    a.player_name,
    a.competition_id,
    a.yellow_cards,
    a.red_cards,
    a.goals,
    a.assists,
    a.minutes_played,
    COALESCE(se_in.sub_on_minute, 0) AS played_from_minute,
    se_out.sub_off_minute AS subbed_off_minute,
    (COALESCE(penalty_goals.penalty_goal_count, (0)::bigint))::integer AS penalty_goals
   FROM (((public.appearances a
     LEFT JOIN ( SELECT game_events.game_id,
            game_events.player_in_id AS player_id,
            game_events.minute AS sub_on_minute
           FROM public.game_events
          WHERE ((game_events.type)::text = 'Substitutions'::text)) se_in ON (((a.player_id = se_in.player_id) AND (a.game_id = se_in.game_id))))
     LEFT JOIN ( SELECT game_events.game_id,
            game_events.player_id,
            game_events.minute AS sub_off_minute
           FROM public.game_events
          WHERE ((game_events.type)::text = 'Substitutions'::text)) se_out ON (((a.player_id = se_out.player_id) AND (a.game_id = se_out.game_id))))
     LEFT JOIN ( SELECT game_events.game_id,
            game_events.player_id,
            count(*) AS penalty_goal_count
           FROM public.game_events
          WHERE (((game_events.type)::text = 'Goals'::text) AND (game_events.description ~~* '%penalty%'::text))
          GROUP BY game_events.game_id, game_events.player_id) penalty_goals ON (((a.player_id = penalty_goals.player_id) AND (a.game_id = penalty_goals.game_id))))
  WITH NO DATA;


--
-- TOC entry 222 (class 1259 OID 16400)
-- Name: appearances_with_event_times; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.appearances_with_event_times AS
WITH appearance_rows AS (
    -- Match the old GROUP BY: identical source rows represent one appearance.
    SELECT DISTINCT appearance_id, game_id, player_id, player_club_id,
        player_current_club_id, date, player_name, competition_id,
        yellow_cards, red_cards, goals, penalty_goals, assists,
        played_from_minute, subbed_off_minute, minutes_played
    FROM public.appearances_enhanced
), player_events AS (
    -- Aggregate before joining so independent event categories cannot multiply.
    -- Event IDs distinguish separate events even when their minutes are equal.
    SELECT game_id, player_id,
        array_agg(minute ORDER BY minute, game_event_id) FILTER (
            WHERE type = 'Goals' AND description NOT ILIKE '%penalty%'
                AND description NOT ILIKE '%own-goal%') AS goal_minutes,
        array_agg(minute ORDER BY minute, game_event_id) FILTER (
            WHERE type = 'Goals' AND description ILIKE '%penalty%') AS penalty_goal_minutes,
        array_agg(minute ORDER BY minute, game_event_id) FILTER (
            WHERE type = 'Goals' AND description ILIKE '%own-goal%') AS own_goal_minutes,
        array_agg(minute ORDER BY minute, game_event_id) FILTER (
            WHERE type = 'Cards' AND description ILIKE '%Yellow%') AS yellow_minutes,
        array_agg(minute ORDER BY minute, game_event_id) FILTER (
            WHERE type = 'Cards' AND description ILIKE '%Red%') AS red_minutes
    FROM public.game_events
    WHERE type IN ('Goals', 'Cards') AND minute IS NOT NULL AND player_id IS NOT NULL
    GROUP BY game_id, player_id
), assist_events AS (
    SELECT game_id, player_assist_id AS player_id,
        array_agg(minute ORDER BY minute, game_event_id) AS assist_minutes
    FROM public.game_events
    WHERE type = 'Goals' AND description NOT ILIKE '%handball%'
        AND description NOT ILIKE '%penalty%'
        AND minute IS NOT NULL AND player_assist_id IS NOT NULL
    GROUP BY game_id, player_assist_id
)
SELECT a.appearance_id, a.game_id, a.player_id, a.player_club_id,
    a.player_current_club_id, a.date, a.player_name, a.competition_id,
    a.yellow_cards, a.red_cards, a.goals, a.penalty_goals, a.assists,
    a.played_from_minute, a.subbed_off_minute,
    COALESCE(e.goal_minutes, ARRAY[]::integer[]) AS goal_minutes,
    COALESCE(e.penalty_goal_minutes, ARRAY[]::integer[]) AS penalty_goal_minutes,
    COALESCE(e.own_goal_minutes, ARRAY[]::integer[]) AS own_goal_minutes,
    COALESCE(s.assist_minutes, ARRAY[]::integer[]) AS assist_minutes,
    COALESCE(e.yellow_minutes, ARRAY[]::integer[]) AS yellow_minutes,
    COALESCE(e.red_minutes, ARRAY[]::integer[]) AS red_minutes,
    ARRAY[
        CASE WHEN a.played_from_minute = 90 AND a.minutes_played = 1 THEN 89
            ELSE a.played_from_minute END,
        CASE WHEN a.played_from_minute = 90 AND a.minutes_played = 1 THEN 90
            WHEN a.played_from_minute = 46 AND a.minutes_played = 45 THEN 90
            ELSE a.played_from_minute + a.minutes_played END
    ] AS minutes_played
FROM appearance_rows a
LEFT JOIN player_events e ON e.game_id = a.game_id AND e.player_id = a.player_id
LEFT JOIN assist_events s ON s.game_id = a.game_id AND s.player_id = a.player_id
WITH NO DATA;


--
-- TOC entry 223 (class 1259 OID 16407)
-- Name: club_games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_games (
    game_id integer,
    club_id integer,
    own_goals integer,
    own_position integer,
    own_manager_name character varying(200),
    opponent_id integer,
    opponent_goals integer,
    opponent_position integer,
    opponent_manager_name character varying(200),
    hosting character varying(10),
    is_win boolean
);


--
-- TOC entry 224 (class 1259 OID 16410)
-- Name: clubs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clubs (
    club_id integer NOT NULL,
    club_code character varying(50),
    name character varying(200),
    domestic_competition_id character varying(50),
    total_market_value numeric(15,2),
    squad_size integer,
    average_age numeric(4,2),
    foreigners_number integer,
    foreigners_percentage numeric(5,2),
    national_team_players integer,
    stadium_name character varying(200),
    stadium_seats integer,
    net_transfer_record character varying(50),
    coach_name character varying(200),
    last_season integer,
    filename character varying(200),
    url character varying(500)
);


--
-- TOC entry 225 (class 1259 OID 16416)
-- Name: clubs_club_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clubs_club_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5062 (class 0 OID 0)
-- Dependencies: 225
-- Name: clubs_club_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clubs_club_id_seq OWNED BY public.clubs.club_id;


--
-- TOC entry 226 (class 1259 OID 16417)
-- Name: competitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competitions (
    competition_id character varying(10) NOT NULL,
    competition_code character varying(50),
    name character varying(200),
    sub_type character varying(100),
    type character varying(100),
    country_id integer,
    country_name character varying(100),
    domestic_league_code character varying(50),
    confederation character varying(100),
    url character varying(500),
    is_major_national_league boolean
);


--
-- TOC entry 227 (class 1259 OID 16427)
-- Name: games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.games (
    game_id integer NOT NULL,
    competition_id character varying(10),
    season integer,
    round character varying(50),
    date date,
    home_club_id integer,
    away_club_id integer,
    home_club_goals integer,
    away_club_goals integer,
    home_club_position integer,
    away_club_position integer,
    home_club_manager_name character varying(200),
    away_club_manager_name character varying(200),
    stadium character varying(200),
    attendance integer,
    referee character varying(200),
    url character varying(500),
    home_club_formation character varying(50),
    away_club_formation character varying(50),
    home_club_name character varying(200),
    away_club_name character varying(200),
    aggregate character varying(20),
    competition_type character varying(50)
);


--
-- TOC entry 228 (class 1259 OID 16448)
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    player_id integer NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    name character varying(200),
    last_season integer,
    current_club_id integer,
    player_code character varying(50),
    country_of_birth character varying(100),
    city_of_birth character varying(100),
    country_of_citizenship character varying(100),
    date_of_birth date,
    sub_position character varying(100),
    "position" character varying(100),
    foot character varying(20),
    height_in_cm integer,
    contract_expiration_date date,
    agent_name character varying(200),
    image_url character varying(500),
    url character varying(500),
    current_club_domestic_competition_id character varying(50),
    current_club_name character varying(200),
    market_value_in_eur bigint,
    highest_market_value_in_eur bigint
);


--
-- TOC entry 229 (class 1259 OID 16454)
-- Name: players_player_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.players_player_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5063 (class 0 OID 0)
-- Dependencies: 229
-- Name: players_player_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.players_player_id_seq OWNED BY public.players.player_id;


--
-- TOC entry 4893 (class 2604 OID 16455)
-- Name: clubs club_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clubs ALTER COLUMN club_id SET DEFAULT nextval('public.clubs_club_id_seq'::regclass);


--
-- TOC entry 4894 (class 2604 OID 16456)
-- Name: players player_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players ALTER COLUMN player_id SET DEFAULT nextval('public.players_player_id_seq'::regclass);


--
-- TOC entry 4902 (class 2606 OID 16458)
-- Name: competitions competitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_pkey PRIMARY KEY (competition_id);


--
-- TOC entry 4896 (class 2606 OID 16467)
-- Name: appearances appearances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appearances
    ADD CONSTRAINT appearances_pkey PRIMARY KEY (appearance_id);


--
-- TOC entry 4900 (class 2606 OID 16469)
-- Name: clubs clubs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_pkey PRIMARY KEY (club_id);


--
-- TOC entry 4898 (class 2606 OID 16471)
-- Name: game_events game_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_events
    ADD CONSTRAINT game_events_pkey PRIMARY KEY (game_event_id);


--
-- TOC entry 4904 (class 2606 OID 16473)
-- Name: games game_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT game_id PRIMARY KEY (game_id);


--
-- TOC entry 4906 (class 2606 OID 16479)
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (player_id);


--
-- Performance indexes for the query engine.
--

CREATE INDEX IF NOT EXISTS idx_games_season ON public.games USING btree (season);
CREATE INDEX IF NOT EXISTS idx_games_home ON public.games USING btree (home_club_id);
CREATE INDEX IF NOT EXISTS idx_games_away ON public.games USING btree (away_club_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON public.players USING btree (sub_position);
CREATE INDEX IF NOT EXISTS idx_players_country ON public.players USING btree (country_of_citizenship);
CREATE INDEX IF NOT EXISTS idx_enh_player_game ON public.appearances_enhanced USING btree (player_id, game_id);
CREATE INDEX IF NOT EXISTS idx_enh_comp ON public.appearances_enhanced USING btree (competition_id);
CREATE INDEX IF NOT EXISTS idx_enh_club ON public.appearances_enhanced USING btree (player_club_id);
CREATE INDEX IF NOT EXISTS idx_evt_times_player ON public.appearances_with_event_times USING btree (player_id);
CREATE INDEX IF NOT EXISTS idx_events_game_cover ON public.game_events USING btree (game_id) INCLUDE (player_id, player_assist_id, type, minute, is_penalty, is_yellow, is_red);


-- Completed on 2026-08-21 11:27:03

--
-- PostgreSQL database dump complete
--

\unrestrict ulKJfoafxPsFlK71K1qH9nEayfEyLg9hKklEgd57ZCRB1PiiFESvB3fBtypTgZp

