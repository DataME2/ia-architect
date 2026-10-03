-- 0079 — The committee confirms its own (scope 80; BR166, BR167).
--
-- A position on the committee was a row an admin typed. Nothing said
-- whether it had been confirmed, and nothing stopped a term holding two
-- Presidents. The club's rule, October 2026:
--
--   * **The officers — President, Secretary, Treasurer and IT Manager — are
--     confirmed by the AGM election.** Recording a resolution of category
--     `agm_election` for a term confirms every live officer in it, naming the
--     resolution. It is refused while an office has two live holders, and
--     says which (BR166).
--   * **Every other position is confirmed by the three executive officers.**
--     The confirmed President, Treasurer and Secretary of the same term each
--     confirm through `app_confirm_committee_position()`; the third
--     confirmation confirms it. Each confirmation is audited and lands in
--     every committee member's inbox (BR167).
--
-- IT Manager becomes an elected office (it was only an appointed function,
-- 0059), carrying the IT manager's access.

-- ------------------------------------------------------- the IT Manager office

alter table committee_position drop constraint if exists committee_position_position_check;
alter table committee_position add constraint committee_position_position_check
  check (position in (
    'president','vice-president','secretary','treasurer','it-manager',
    'registrar','committee-member','subcommittee-member'
  ));

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
    ('office',   'it-manager',                 'digital_technology_manager'),
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

-- --------------------------------------------------------- confirmation state

alter table committee_position
  add column confirmed_at               timestamptz,
  add column confirmed_by_resolution_id uuid references committee_resolution(id);

comment on column committee_position.confirmed_at is
  'BR166/BR167: when the position was confirmed — by the AGM election '
  'resolution (officers) or by the third executive confirmation (others).';

alter table committee_resolution drop constraint if exists committee_resolution_category_check;
alter table committee_resolution add constraint committee_resolution_category_check
  check (category in ('general', 'voucher_program', 'agm_election'));

create table committee_position_confirmation (
  id                  uuid primary key default gen_random_uuid(),
  club_id             uuid not null references club(id) on delete cascade,
  position_id         uuid not null references committee_position(id) on delete cascade,
  confirmer_office    text not null check (confirmer_office in ('president', 'treasurer', 'secretary')),
  confirmer_person_id uuid not null references person(id),
  confirmed_by_user_id uuid,
  confirmed_at        timestamptz not null default now(),
  unique (position_id, confirmer_office)
);

alter table committee_position_confirmation enable row level security;

create policy committee_position_confirmation_select on committee_position_confirmation
  for select using (club_id in (select app_member_club_ids()));

-- No write policy: confirmations go through the function below.

-- -------------------------------------------- notifying the committee (BR167)
-- Every account linked to a live position in the term, but the actor.

create or replace function app_notify_committee(
  p_club_id uuid, p_term_id uuid, p_kind text, p_headline text, p_detail text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into notification (club_id, recipient_user_id, kind, headline, detail, link_path)
  select distinct p_club_id, ap.user_id, p_kind, p_headline, p_detail, '/registrar/governance'
    from committee_position cp
    join account_person ap on ap.club_id = cp.club_id and ap.person_id = cp.person_id
   where cp.club_id = p_club_id
     and cp.term_id = p_term_id
     and cp.resigned_on is null
     and ap.user_id is distinct from auth.uid()
$$;

revoke all on function app_notify_committee(uuid, uuid, text, text, text) from public;

-- ---------------------------------------- the AGM election confirms officers

create or replace function committee_resolution_confirms_officers()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_doubled text;
  v_count   integer;
begin
  if new.category <> 'agm_election' then
    return new;
  end if;

  select string_agg(position || ' (' || n || ' holders)', ', ')
    into v_doubled
    from (select position, count(*) as n
            from committee_position
           where term_id = new.term_id
             and position in ('president', 'secretary', 'treasurer', 'it-manager')
             and resigned_on is null
           group by position
          having count(*) > 1) d;
  if v_doubled is not null then
    raise exception 'An AGM election confirms one holder per office; this term has more than one: %. Record the resignation first (BR166).', v_doubled
      using errcode = '23514';
  end if;

  update committee_position
     set confirmed_at = now(), confirmed_by_resolution_id = new.id
   where term_id = new.term_id
     and position in ('president', 'secretary', 'treasurer', 'it-manager')
     and resigned_on is null
     and confirmed_at is null;
  get diagnostics v_count = row_count;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (new.club_id, auth.uid(), 'committee_officers_confirmed', 'committee_resolution', new.id,
          jsonb_build_object('term_id', new.term_id, 'confirmed', v_count));

  perform app_notify_committee(new.club_id, new.term_id, 'committee_confirmation',
    'The AGM election confirmed ' || v_count || ' officer' || case when v_count = 1 then '' else 's' end,
    new.summary);

  return new;
end;
$$;

create trigger committee_resolution_confirms_officers
  after insert on committee_resolution
  for each row execute function committee_resolution_confirms_officers();

-- ------------------------------- the executive confirms every other position

create or replace function app_confirm_committee_position(p_position_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pos     committee_position;
  v_office  text;
  v_person  uuid;
  v_done    integer;
  v_name    text;
begin
  select * into v_pos from committee_position where id = p_position_id;
  if v_pos.id is null then
    raise exception 'No such position.';
  end if;
  if v_pos.position in ('president', 'secretary', 'treasurer', 'it-manager') then
    raise exception 'An officer is confirmed by the AGM election resolution, not by the executive (BR166).';
  end if;
  if v_pos.resigned_on is not null then
    raise exception 'That position has been resigned.';
  end if;
  if v_pos.confirmed_at is not null then
    raise exception 'That position is already confirmed.';
  end if;

  -- The caller's own confirmed executive office in the same term.
  select cp.position, cp.person_id into v_office, v_person
    from committee_position cp
    join account_person ap on ap.club_id = cp.club_id and ap.person_id = cp.person_id
   where cp.term_id = v_pos.term_id
     and cp.position in ('president', 'treasurer', 'secretary')
     and cp.resigned_on is null
     and cp.confirmed_at is not null
     and ap.user_id = auth.uid()
     and not exists (select 1 from committee_position_confirmation c
                      where c.position_id = p_position_id and c.confirmer_office = cp.position)
   order by array_position(array['president', 'treasurer', 'secretary'], cp.position)
   limit 1;
  if v_office is null then
    raise exception 'Only the confirmed President, Treasurer or Secretary of this term confirms a position, once each (BR167).'
      using errcode = '42501';
  end if;

  insert into committee_position_confirmation
    (club_id, position_id, confirmer_office, confirmer_person_id, confirmed_by_user_id)
  values (v_pos.club_id, p_position_id, v_office, v_person, auth.uid());

  select count(*) into v_done from committee_position_confirmation where position_id = p_position_id;
  if v_done = 3 then
    update committee_position set confirmed_at = now() where id = p_position_id;
  end if;

  select coalesce(p.preferred_name, p.legal_given_names) || ' ' || p.legal_family_name into v_name
    from person p where p.id = v_pos.person_id;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (v_pos.club_id, auth.uid(), 'committee_position_confirmation', 'committee_position', p_position_id,
          jsonb_build_object('office', v_office, 'confirmations', v_done));

  perform app_notify_committee(v_pos.club_id, v_pos.term_id, 'committee_confirmation',
    case when v_done = 3
         then v_name || ' is confirmed as ' || replace(v_pos.position, '-', ' ')
         else 'The ' || v_office || ' confirmed ' || v_name || ' as ' || replace(v_pos.position, '-', ' ')
              || ' (' || v_done || ' of 3)' end,
    null);

  return case when v_done = 3 then 'confirmed' else v_done || ' of 3' end;
end;
$$;

revoke all on function app_confirm_committee_position(uuid) from public;
grant execute on function app_confirm_committee_position(uuid) to authenticated;
