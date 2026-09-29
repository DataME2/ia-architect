-- 0059 — An appointment grants access (scope 68, BR153/BR154).
--
-- Answers the first half of open question #78: an elected office or an
-- appointed club function now carries the system access mapped to it.
-- Before this, `committee_position` (the office) and `club_membership`
-- (the grant) were unrelated — electing a President gave them nothing, and
-- an admin granted roles and linked accounts to people by hand on
-- /registrar/access.
--
-- The flow this supports:
--   1. The Person is on record (People).
--   2. They are appointed to an office (elected, per term) or a club
--      function (appointed, open-ended) on Governance.
--   3. An admin — or the current President — confirms the appointment's
--      access. If the Person's account is already linked, the access is
--      granted at once; otherwise an invitation is recorded against their
--      email and the application sends a sign-in link.
--   4. They follow the link, set a password (0019), and `claim_staff_access`
--      links their account to the Person the confirmer named (decision 10:
--      asserted, never inferred) and grants the mapped access.
--
-- **Access is kept when the appointment ends** (BR154, stakeholder
-- decision September 2026) — nothing here revokes. Removal stays an
-- admin's act on /registrar/access, which flags access whose appointment
-- has ended so it is noticed rather than forgotten.

-- ------------------------------------------------------------- the mapping
-- One source of truth for "this office or function carries this access",
-- read by the confirm function below and by the Governance screen through
-- RPC, so the screen and the database cannot describe it differently.

create or replace function app_appointment_access_map()
returns table (source text, value text, access_role text)
language sql
immutable
as $$
  values
    ('office',   'president',                  'admin'),
    ('office',   'vice-president',             'admin'),
    ('office',   'secretary',                  'secretary'),
    ('office',   'treasurer',                  'treasurer'),
    ('office',   'registrar',                  'registrar'),
    ('office',   'committee-member',           'committee'),
    ('office',   'subcommittee-member',        'committee'),
    ('function', 'it_manager',                 'digital_technology_manager'),
    ('function', 'blue_card_administrator',    'blue_card_administrator'),
    ('function', 'program_coordinator',        'program_coordinator'),
    ('function', 'referee_coordinator',        'coordinator'),
    ('function', 'coach',                      'coach'),
    ('function', 'technical_director',         'technical_director'),
    ('function', 'head_of_performance',        'head_of_performance'),
    ('function', 'head_of_community_football', 'head_of_community_football'),
    ('function', 'head_of_womens_football',    'head_of_womens_football')
$$;

comment on function app_appointment_access_map() is
  'BR153: the access each committee office and club function carries.';

-- --------------------------------------------------- club_function_appointment
-- An appointed (not elected) job at the club. Open-ended unless ended:
-- unlike an office it does not lapse at the AGM, because nobody elects an
-- IT Manager.

create table club_function_appointment (
  id                   uuid primary key default gen_random_uuid(),
  club_id              uuid not null references club(id) on delete cascade,
  person_id            uuid not null,
  kind                 text not null check (kind in (
                         'it_manager','blue_card_administrator','program_coordinator',
                         'referee_coordinator','coach','technical_director',
                         'head_of_performance','head_of_community_football',
                         'head_of_womens_football')),
  starts_on            date not null default current_date,
  ends_on              date,
  appointed_by_user_id uuid default auth.uid(),
  created_at           timestamptz not null default now(),
  foreign key (club_id, person_id) references person (club_id, id) on delete cascade,
  check (ends_on is null or ends_on >= starts_on)
);

create index club_function_appointment_person on club_function_appointment (club_id, person_id);

alter table club_function_appointment enable row level security;

-- --------------------------------------------------------------- who confirms
-- The President of the governing term — the latest term already started,
-- the same definition as `governingTerm` in src/domain/governance/term.ts —
-- who has not resigned, and whose account is linked to that Person.

create or replace function app_is_current_president(p_club uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from committee_position cp
      join account_person ap
        on ap.club_id = cp.club_id and ap.person_id = cp.person_id
     where cp.club_id = p_club
       and ap.user_id = auth.uid()
       and cp.position = 'president'
       and cp.resigned_on is null
       and cp.term_id = (
         select t.id from committee_term t
          where t.club_id = p_club and t.starts_on <= current_date
          order by t.starts_on desc
          limit 1
       )
  );
$$;

create or replace function app_may_confirm_appointments(p_club uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app_has_role(p_club, array['admin']) or app_is_current_president(p_club);
$$;

comment on function app_may_confirm_appointments(uuid) is
  'BR153: an admin, or the current President, confirms the access an appointment carries.';

create policy club_function_appointment_select on club_function_appointment
  for select using (club_id in (select app_member_club_ids()));

create policy club_function_appointment_manage on club_function_appointment
  for all using (app_may_confirm_appointments(club_id))
  with check (app_may_confirm_appointments(club_id));

-- --------------------------------------------------------- appointment_access
-- The record that an appointment's access was confirmed, to whom it was
-- addressed, and whether it has been claimed — the provenance
-- /registrar/access reads to say *why* somebody holds what they hold.

create table appointment_access (
  id                      uuid primary key default gen_random_uuid(),
  club_id                 uuid not null references club(id) on delete cascade,
  person_id               uuid not null,
  email                   text not null check (position('@' in email) > 1),
  access_role             text not null,
  committee_position_id   uuid references committee_position(id) on delete set null,
  function_appointment_id uuid references club_function_appointment(id) on delete set null,
  confirmed_by_user_id    uuid not null,
  confirmed_at            timestamptz not null default now(),
  claimed_user_id         uuid references auth.users(id) on delete set null,
  claimed_at              timestamptz,
  foreign key (club_id, person_id) references person (club_id, id) on delete cascade,
  check (num_nonnulls(committee_position_id, function_appointment_id) <= 1)
);

create unique index appointment_access_office on appointment_access (committee_position_id)
  where committee_position_id is not null;
create unique index appointment_access_function on appointment_access (function_appointment_id)
  where function_appointment_id is not null;

alter table appointment_access enable row level security;

-- Readable by the club like guardian_invitation and player_invitation are.
-- No write policy: rows are written only by the two functions below.
create policy appointment_access_select on appointment_access
  for select using (club_id in (select app_member_club_ids()));

-- --------------------------------------------------- confirm_appointment_access
-- Returns 'granted' when the Person's account was already linked and the
-- access is live now, or 'invited' when the application must send a
-- sign-in link to the returned email.

create or replace function confirm_appointment_access(
  p_committee_position_id   uuid default null,
  p_function_appointment_id uuid default null
)
returns table (outcome text, sent_to text, grants text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club    uuid;
  v_person  uuid;
  v_source  text;
  v_value   text;
  v_current boolean;
  v_role    text;
  v_email   text;
  v_user    uuid;
begin
  if num_nonnulls(p_committee_position_id, p_function_appointment_id) <> 1 then
    raise exception 'Name exactly one appointment.' using errcode = '22023';
  end if;

  if p_committee_position_id is not null then
    select cp.club_id, cp.person_id, 'office', cp.position,
           cp.resigned_on is null and cp.term_id = (
             select t.id from committee_term t
              where t.club_id = cp.club_id and t.starts_on <= current_date
              order by t.starts_on desc limit 1)
      into v_club, v_person, v_source, v_value, v_current
      from committee_position cp where cp.id = p_committee_position_id;
  else
    select f.club_id, f.person_id, 'function', f.kind,
           f.starts_on <= current_date and (f.ends_on is null or f.ends_on >= current_date)
      into v_club, v_person, v_source, v_value, v_current
      from club_function_appointment f where f.id = p_function_appointment_id;
  end if;

  if v_club is null then
    raise exception 'No such appointment.' using errcode = 'P0002';
  end if;

  if not app_may_confirm_appointments(v_club) then
    raise exception 'Only an administrator or the current President may confirm access (BR153).'
      using errcode = '42501';
  end if;

  if not v_current then
    raise exception 'This appointment is not current, so it carries no access to confirm.'
      using errcode = '22023';
  end if;

  select m.access_role into v_role
    from app_appointment_access_map() m
   where m.source = v_source and m.value = v_value;

  select lower(btrim(p.email)) into v_email from person p where p.id = v_person;
  if v_email is null or v_email = '' then
    raise exception 'This person has no email address on record. Add one to their record first, then confirm.'
      using errcode = '22023';
  end if;

  select ap.user_id into v_user
    from account_person ap where ap.club_id = v_club and ap.person_id = v_person;

  -- Confirming again is a resend: refresh the address and the confirmer,
  -- never a second row for the same appointment.
  update appointment_access a
     set email = v_email, confirmed_by_user_id = auth.uid(), confirmed_at = now(),
         claimed_user_id = coalesce(a.claimed_user_id, v_user),
         claimed_at = coalesce(a.claimed_at, case when v_user is null then null else now() end)
   where a.committee_position_id is not distinct from p_committee_position_id
     and a.function_appointment_id is not distinct from p_function_appointment_id;

  if not found then
    insert into appointment_access (
      club_id, person_id, email, access_role, committee_position_id, function_appointment_id,
      confirmed_by_user_id, claimed_user_id, claimed_at)
    values (
      v_club, v_person, v_email, v_role, p_committee_position_id, p_function_appointment_id,
      auth.uid(), v_user, case when v_user is null then null else now() end);
  end if;

  if v_user is not null then
    insert into club_membership (club_id, user_id, role)
    values (v_club, v_user, v_role)
    on conflict do nothing;
  end if;

  insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
  values (v_club, 'access.appointment_confirmed', 'person', v_person, auth.uid(),
          jsonb_build_object('source', v_source, 'value', v_value, 'role', v_role,
                             'granted_now', v_user is not null));

  return query select case when v_user is null then 'invited' else 'granted' end, v_email, v_role;
end;
$$;

comment on function confirm_appointment_access(uuid, uuid) is
  'BR153: confirms the access an office or club function carries — granted at once to a '
  'linked account, otherwise recorded as an invitation the application sends as a link.';

-- ------------------------------------------------------------ claim_staff_access
-- claim_player_access's shape (0053): run on arrival from a sign-in link,
-- reads the email from the caller's own session and never from an argument.

create or replace function claim_staff_access()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_email text;
  v_row   record;
  v_count integer := 0;
begin
  if v_user is null then return 0; end if;

  select lower(email) into v_email from auth.users where id = v_user;
  if v_email is null or v_email = '' then return 0; end if;

  for v_row in
    select * from appointment_access
     where lower(email) = v_email and claimed_user_id is null
  loop
    -- The confirmer already named this Person; this executes that
    -- assertion (decision 10) rather than inferring one from the address.
    insert into account_person (club_id, user_id, person_id, linked_by)
    values (v_row.club_id, v_user, v_row.person_id, v_row.confirmed_by_user_id)
    on conflict do nothing;

    -- If the account is linked to somebody else here, or the Person to
    -- another account, the invitation was not for this account: grant
    -- nothing rather than attach an office to the wrong human.
    if not exists (
      select 1 from account_person
       where club_id = v_row.club_id and user_id = v_user and person_id = v_row.person_id
    ) then
      continue;
    end if;

    insert into club_membership (club_id, user_id, role)
    values (v_row.club_id, v_user, v_row.access_role)
    on conflict do nothing;

    update appointment_access
       set claimed_user_id = v_user, claimed_at = now()
     where id = v_row.id;

    insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
    values (v_row.club_id, 'access.appointment_claimed', 'appointment_access', v_row.id, v_user,
            jsonb_build_object('email', v_email, 'role', v_row.access_role));

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function app_appointment_access_map() to authenticated;
grant execute on function app_may_confirm_appointments(uuid) to authenticated;
grant execute on function confirm_appointment_access(uuid, uuid) to authenticated;
grant execute on function claim_staff_access() to authenticated;
