-- 0093 — The Technical Director's workspace (scope 98, BR176, BR177).
--
-- qa.techdirector failed QA because the role had permissions and nowhere
-- to use them, and no way to learn that anything about a player had
-- changed. Three things here, each the smallest the request needs:
--
--   1. BR177 — a recorded appearance is corrected only with a stated,
--      verifiable source, kept with the correction. `appearance_correction`
--      is the append-only record; `app_correct_appearance` is the only door
--      into it, and the only way to correct, record late or remove an
--      appearance with a source.
--   2. BR176 — the TD reads player activity. `audit_event` stays admin-only
--      (0002); `app_player_activity` returns the player facts from it, each
--      with its subject named, and nothing about money (BR78).
--   3. BR62 already named the technical director among those who see a
--      decline's reason, and `participation_response_select_officers` never
--      did. The TD's squad view reads Saturday's answers, so the read is
--      brought into line with the rule rather than the rule with the read.

-- ------------------------------------------------- 1. appearance_correction

create table appearance_correction (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references club(id) on delete cascade,
  registration_id uuid not null references registration(id) on delete cascade,
  person_id       uuid not null references person(id) on delete cascade,
  fixture_id      uuid not null references fixture(id) on delete cascade,
  -- Not a foreign key: a removal deletes the appearance, and the record of
  -- why it was removed has to outlive it.
  appearance_id   uuid,
  action          text not null check (action in ('recorded', 'corrected', 'removed')),
  before          jsonb,
  after           jsonb,
  source          text not null check (char_length(btrim(source)) between 8 and 500),
  corrected_by    uuid not null,
  corrected_at    timestamptz not null default now()
);

create index appearance_correction_registration_idx
  on appearance_correction (registration_id, corrected_at desc);

alter table appearance_correction enable row level security;

-- Read as widely as the appearances themselves (`appearance_select`, 0020):
-- whoever reads a figure reads why it changed. Written only by the function
-- below, which runs as its owner, so there is no insert policy at all; and
-- never changed or removed once written.
create policy appearance_correction_select on appearance_correction
  for select using (club_id in (select app_member_club_ids()));
create policy appearance_correction_no_update on appearance_correction
  for update using (false);
create policy appearance_correction_no_delete on appearance_correction
  for delete using (false);

comment on table appearance_correction is
  'BR177: every correction of a recorded appearance — recorded late, corrected or removed — with the figures before and after, the stated source, who and when. Append-only; written only by app_correct_appearance.';

-- ------------------------------------------------ app_correct_appearance()
-- Who: the Technical Director, or anyone BR158 lets record this player's
-- appearances (admin, registrar, coordinator, or a coach on the player's
-- team that season). Everything else is derived from the registration, so
-- a caller cannot point a correction at another club's fixture or player.

create or replace function app_correct_appearance(
  p_registration_id uuid,
  p_fixture_id      uuid,
  p_minutes         integer,
  p_started         boolean,
  p_goals           integer,
  p_assists         integer,
  p_source          text,
  p_remove          boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg    registration;
  v_old    appearance;
  v_new    appearance;
  v_action text;
  v_source text := btrim(coalesce(p_source, ''));
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  select * into v_reg from registration where id = p_registration_id;
  if not found then
    raise exception 'No such registration.' using errcode = 'P0002';
  end if;

  if not (
    app_has_role(v_reg.club_id, array['admin', 'registrar', 'coordinator', 'technical_director'])
    or app_coaches_registration(p_registration_id)
  ) then
    raise exception 'Only the Technical Director, or somebody who records this player''s appearances, corrects them (BR177).'
      using errcode = '42501';
  end if;

  if char_length(v_source) < 8 then
    raise exception 'Name where the correction comes from — the referee''s match report, the result sheet, a video (BR177).'
      using errcode = '23514';
  end if;

  if not exists (select 1 from fixture where id = p_fixture_id and club_id = v_reg.club_id) then
    raise exception 'That fixture is not this club''s.' using errcode = 'P0002';
  end if;

  select * into v_old from appearance where fixture_id = p_fixture_id and person_id = v_reg.person_id;

  if p_remove then
    if v_old.id is null then
      raise exception 'Nothing is recorded for that fixture to remove.' using errcode = 'P0002';
    end if;
    delete from appearance where id = v_old.id;
    v_action := 'removed';
  elsif v_old.id is null then
    insert into appearance (club_id, fixture_id, person_id, registration_id,
                            minutes_played, started, goals, assists)
    values (v_reg.club_id, p_fixture_id, v_reg.person_id, p_registration_id,
            p_minutes, coalesce(p_started, false), p_goals, p_assists)
    returning * into v_new;
    v_action := 'recorded';
  else
    update appearance
       set minutes_played = p_minutes,
           started        = coalesce(p_started, v_old.started),
           goals          = p_goals,
           assists        = p_assists
     where id = v_old.id
    returning * into v_new;
    v_action := 'corrected';
  end if;

  insert into appearance_correction
    (club_id, registration_id, person_id, fixture_id, appearance_id, action, before, after, source, corrected_by)
  values (
    v_reg.club_id, p_registration_id, v_reg.person_id, p_fixture_id,
    coalesce(v_new.id, v_old.id), v_action,
    case when v_old.id is null then null else jsonb_build_object(
      'minutes', v_old.minutes_played, 'started', v_old.started, 'goals', v_old.goals, 'assists', v_old.assists) end,
    case when v_new.id is null then null else jsonb_build_object(
      'minutes', v_new.minutes_played, 'started', v_new.started, 'goals', v_new.goals, 'assists', v_new.assists) end,
    v_source, auth.uid()
  );

  return coalesce(v_new.id, v_old.id);
end
$$;

revoke all on function app_correct_appearance(uuid, uuid, integer, boolean, integer, integer, text, boolean) from public;
grant execute on function app_correct_appearance(uuid, uuid, integer, boolean, integer, integer, text, boolean) to authenticated;

-- --------------------------------------------------- app_player_activity()
-- BR176. The player facts in `audit_event`, for the Technical Director or
-- an admin, each with the person it is about. Money is excluded by naming
-- what is included: no payment, plan, amount or voucher action is listed.
-- A subject is resolved from wherever that action keeps it, and only a
-- person who holds a registration at this club is reported — the feed is
-- about players, not every role.

create or replace function app_player_activity(p_club_id uuid, p_days integer default 30)
returns table (occurred_at timestamptz, action text, person_id uuid, person_name text, actor_name text)
language sql
stable
security definer
set search_path = public
as $$
  with ev as (
    select a.occurred_at, a.action, a.actor_user_id,
           case
             when a.entity = 'person' then a.entity_id
             when a.entity = 'person_role' then a.entity_id
             when a.entity = 'team_member' and a.action = 'team_member_added' then a.entity_id
             when a.entity = 'team_member' then nullif(a.detail->>'personId', '')::uuid
             when a.entity = 'registration' then (select r.person_id from registration r where r.id = a.entity_id)
             when a.entity = 'registration_document'
               then (select r.person_id from registration r where r.id = nullif(a.detail->>'registrationId', '')::uuid)
             when a.entity = 'appearance' then nullif(a.detail->>'person_id', '')::uuid
             when a.entity = 'player_record_correction' then nullif(a.detail->>'personId', '')::uuid
           end as person_id
      from audit_event a
     where app_has_role(p_club_id, array['admin', 'technical_director'])
       and a.club_id = p_club_id
       and a.occurred_at > now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 90))
       and a.action in (
         'registration_created', 'public_registration_submitted', 'registration_submitted',
         'registration_status_derived', 'document_received',
         'season_role_granted', 'season_role_revoked',
         'team_member_added', 'team_member_removed',
         'person.details_corrected', 'legal_name_verified', 'person_merged',
         'player_record_correction.confirmed', 'player_record_correction.declined',
         'appearance.recorded', 'appearance.changed', 'appearance.removed'
       )
  )
  select ev.occurred_at,
         ev.action,
         ev.person_id,
         coalesce(p.preferred_name, p.legal_given_names) || ' ' || p.legal_family_name,
         (select coalesce(q.preferred_name, q.legal_given_names) || ' ' || q.legal_family_name
            from account_person ap
            join person q on q.id = ap.person_id
           where ap.user_id = ev.actor_user_id and ap.club_id = p_club_id
           limit 1)
    from ev
    join person p on p.id = ev.person_id and p.club_id = p_club_id
   where exists (select 1 from registration r where r.person_id = ev.person_id and r.club_id = p_club_id)
   order by ev.occurred_at desc
   limit 200
$$;

revoke all on function app_player_activity(uuid, integer) from public;
grant execute on function app_player_activity(uuid, integer) to authenticated;

comment on function app_player_activity(uuid, integer) is
  'BR176: player facts from audit_event for the Technical Director or an admin, subject named, no money (BR78). Empty for anyone else.';

-- ------------------------------------------- 3. BR62's reader, as written

drop policy if exists participation_response_select_officers on participation_response;
create policy participation_response_select_officers on participation_response
  for select using (
    app_has_role(club_id, array['admin', 'registrar', 'coordinator', 'coach', 'technical_director'])
  );

insert into schema_migration_log (version, name) values
  ('0093', '0093_the_technical_directors_workspace');
