-- Run once against a NEW, empty test database. Never reset or reseed in individual tests.
\set ON_ERROR_STOP on
DO $$ BEGIN
    IF current_database() NOT LIKE '%\_test' ESCAPE '\' THEN
        RAISE EXCEPTION 'Use a dedicated database whose name ends in _test';
    END IF;
    IF to_regclass('public.players') IS NOT NULL THEN
        RAISE EXCEPTION 'Bootstrap requires a new empty database; it does not reset an existing one';
    END IF;
END $$;
\ir ../../../dbschema.sql
\ir football.sql
\ir extra_time.sql
\ir half_time.sql

-- Player-page retrieval filters on the type stored on each game.
UPDATE public.games g
SET competition_type = c.type
FROM public.competitions c
WHERE g.competition_id = c.competition_id;

-- Version the complete fixture once, after every seed file has loaded.
BEGIN;
CREATE TABLE public.test_fixture_metadata (name text PRIMARY KEY, version integer NOT NULL);
INSERT INTO public.test_fixture_metadata VALUES ('football-boundaries', 1);
COMMIT;
