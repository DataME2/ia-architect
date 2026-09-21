-- 0056 — The confirmed match marks itself played (BR151, scope 66 follow-up).
--
-- Asked directly, straight after 0055 shipped: once a guardian confirms a
-- MiniRef's match, the fixture itself should show as played and carry the
-- score — the club's own record of the game, not a second, separate one
-- nobody reads. If no score comes with the confirmation, a coordinator,
-- registrar or admin can still enter it afterwards; that path did not
-- exist before this migration either, so it is built here too.
--
-- **0055 is never edited — this is a new migration, as it must be.** It
-- has already been applied to the linked Supabase project.
--
-- **The column names were wrong, not just unclear.** `home_score` /
-- `away_score` read as "the home team's score", but `fixture.goals_for` /
-- `goals_against` are **the club's own goals**, regardless of which side
-- of the ground they were standing on. A club playing away would have had
-- its own goals written into the opponent's column. Renamed to match
-- `fixture`'s own semantics before anything reads them, rather than
-- shipping a trigger that quietly swaps a scoreline for every away fixture.

alter table referee_match_confirmation rename column home_score to goals_for;
alter table referee_match_confirmation rename column away_score to goals_against;

comment on column referee_match_confirmation.goals_for is
  'The confirming guardian''s recollection of the club''s own goals — statistics only until copied '
  'to fixture.goals_for, which stays the club''s record (BR151).';
comment on column referee_match_confirmation.goals_against is
  'The confirming guardian''s recollection of the opponent''s goals (BR151).';

-- --------------------------------------------------- the sync into fixture
-- **Never overwrites an existing score.** A guardian's recollection fills
-- a gap; it does not correct a coordinator who already entered the real
-- one. Status only moves scheduled → played — a fixture already cancelled,
-- abandoned or forfeited is not silently reopened because somebody
-- confirmed a MiniRef officiated part of it.
--
-- A second trigger, after the BR151 guard in 0055 rather than folded into
-- it: that one's job is *whether this confirmation may exist at all*, and
-- this one's job is *what a confirmation that exists does to the fixture*
-- — two questions, kept apart the way 0025's three refusals and 0045's
-- "family only answers" guard already are on other tables.

create or replace function apply_match_confirmation_to_fixture()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update fixture
     set status = case when status = 'scheduled' then 'played' else status end,
         goals_for = coalesce(goals_for, new.goals_for),
         goals_against = coalesce(goals_against, new.goals_against)
   where id = new.fixture_id
     and club_id = new.club_id;
  return new;
end;
$$;

create trigger match_confirmation_marks_fixture_played
  after insert on referee_match_confirmation
  for each row execute function apply_match_confirmation_to_fixture();

-- ------------------------------------------------ the officer's own path
-- The gap named directly: there was no way to enter a result on a fixture
-- once created at all — `createFixtureAction` takes a score at the moment
-- of creation, `updateFixtureAction` (BR64) deliberately never touches one
-- ("a score... changing is a correction to the record of a game that
-- happened", its own comment says, and stops there). Officers already hold
-- full write on `fixture` (`fixture_manage`, migration 0020) — this is a
-- gap in the screen, not in the database, so nothing here changes RLS.
comment on table fixture is
  'A game the club played (or will). `goals_for`/`goals_against` are the '
  'club''s own record — set at creation, filled by a guardian''s BR151 '
  'confirmation when empty, or entered afterwards by an admin, registrar '
  'or coordinator through the fixtures screen''s own result form.';
