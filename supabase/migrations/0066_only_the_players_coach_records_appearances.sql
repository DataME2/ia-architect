-- 0066 — Only the player's coach, or an officer, records an appearance; and
-- every record says who and when (scope 71, BR158, BR101).
--
-- `appearance_manage` admitted the admin, registrar, coordinator, any coach at
-- the club, the digital technology manager and the program coordinator. The
-- club's rule (BR158) is narrower: the admin, registrar or coordinator, or a
-- coach or assistant coach on a team the player is on that season. Reading is
-- unchanged: `appearance_select` stays club-wide, so the committee and every
-- other member read appearances, minutes, goals and assists.
--
-- BR101 said a statistic records who entered it and when, but the app set
-- `recorded_by`, so a direct call could leave it blank or name somebody else,
-- and nothing reached `audit_event`. The trigger below makes both facts.

-- ------------------------------------------------- is the caller this player's coach?
-- Everything is derived, nothing is supplied: the season and the player from
-- the registration, the coach from `auth.uid()` (app_my_person_ids, 0043).
-- `security definer` because a coach on a team sheet need not be able to read
-- every registration and team row the question touches.

create or replace function app_coaches_registration(p_registration_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from registration r
      join team t
        on t.club_id = r.club_id and t.season_id = r.season_id
      join team_member player
        on player.team_id = t.id
       and player.person_id = r.person_id
       and player.role = 'player'
       and player.withdrawn_at is null
      join team_member coach
        on coach.team_id = t.id
       and coach.role in ('coach', 'assistant-coach')
       and coach.withdrawn_at is null
     where r.id = p_registration_id
       and coach.person_id in (select app_my_person_ids())
  )
$$;

revoke all on function app_coaches_registration(uuid) from public;
grant execute on function app_coaches_registration(uuid) to authenticated;

comment on function app_coaches_registration(uuid) is
  'BR158: whether the caller is a coach or assistant coach on a team the '
  'registration''s player is on, in that registration''s season.';

-- ------------------------------------------------------------- the write policy

drop policy if exists appearance_manage on appearance;

create policy appearance_manage on appearance
  for all
  using (
    app_has_role(club_id, array['admin','registrar','coordinator'])
    or app_coaches_registration(registration_id)
  )
  with check (
    app_has_role(club_id, array['admin','registrar','coordinator'])
    or app_coaches_registration(registration_id)
  );

-- ------------------------------------------------------------- who and when (BR101)
-- On insert the database names the recorder and the time; the caller cannot.
-- A seed or service call has no `auth.uid()`, and keeps what it supplied.
-- An update corrects the numbers, never the record of who first took them.

create or replace function appearance_stamps_its_recorder()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.recorded_by := auth.uid();
    end if;
    new.recorded_at := now();
  else
    new.recorded_by := old.recorded_by;
    new.recorded_at := old.recorded_at;
  end if;
  return new;
end
$$;

create trigger appearance_stamps_its_recorder
  before insert or update on appearance
  for each row execute function appearance_stamps_its_recorder();

-- Every record, change and removal goes to the append-only audit log, with the
-- figures before and after, so a disputed statistic can be traced to a person
-- and a time. `security definer`: the actor writes the log through this
-- trigger, never directly.

create or replace function appearance_is_audited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row appearance;
begin
  v_row := case when tg_op = 'DELETE' then old else new end;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (
    v_row.club_id,
    auth.uid(),
    case tg_op
      when 'INSERT' then 'appearance.recorded'
      when 'UPDATE' then 'appearance.changed'
      else 'appearance.removed'
    end,
    'appearance',
    v_row.id,
    jsonb_build_object(
      'rule', 'BR158',
      'person_id', v_row.person_id,
      'fixture_id', v_row.fixture_id,
      'registration_id', v_row.registration_id
    )
    || case tg_op
         when 'UPDATE' then jsonb_build_object(
           'before', jsonb_build_object('minutes', old.minutes_played, 'started', old.started,
                                        'goals', old.goals, 'assists', old.assists),
           'after',  jsonb_build_object('minutes', new.minutes_played, 'started', new.started,
                                        'goals', new.goals, 'assists', new.assists))
         else jsonb_build_object('minutes', v_row.minutes_played, 'started', v_row.started,
                                 'goals', v_row.goals, 'assists', v_row.assists)
       end
  );

  return null;
end
$$;

create trigger appearance_is_audited
  after insert or update or delete on appearance
  for each row execute function appearance_is_audited();
