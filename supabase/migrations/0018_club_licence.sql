-- 0018 — Which tenants we support, and which of them are licensed.
--
-- The platform console could say how many clubs exist. It could not say how
-- many are **customers** — the commercial fact the owner actually needs when
-- looking at the list.
--
-- This stays inside decision 9's boundary without widening it. A licence is
-- **metadata about a customer**, held by the party that contracted with
-- them, in the same category as the club's name and its responsible people.
-- It is not a summary of tenant contents, which is the thing that decision
-- says would need a fresh argument.
--
-- **Price is per club and negotiated**, so there is no rate card here and no
-- plan enum. What is recorded is what was agreed with that club: an amount,
-- a currency, a term, and room for the words that made it make sense.

create table club_licence (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references club(id) on delete cascade,

  -- A term, not a flag. Renewal is a new row, so "when did this club stop
  -- paying" and "what did they pay last year" stay answerable — questions a
  -- business asks and a boolean cannot answer.
  starts_on  date not null,
  ends_on    date not null,

  state      text not null default 'active'
    check (state in ('trial','active','suspended','ended')),

  -- Negotiated, so nullable: a trial or a pilot may have no fee, and
  -- recording zero would claim a commercial fact that was never agreed.
  fee_cents  bigint check (fee_cents is null or fee_cents >= 0),
  currency   text not null default 'AUD' check (currency in ('AUD','NZD')),

  -- What was actually agreed. Terms negotiated one club at a time do not
  -- fit in columns, and the alternative to a note is the detail living in
  -- somebody's email.
  note       text,

  created_at timestamptz not null default now(),

  constraint club_licence_term_is_a_term check (ends_on > starts_on),
  -- One licence per club per start date. Renewals differ by start date;
  -- correcting today's entry updates it.
  unique (club_id, starts_on)
);

create index club_licence_club_idx on club_licence (club_id, starts_on desc);

alter table club_licence enable row level security;

-- Readable by the club it belongs to — a club is entitled to see its own
-- commercial terms. Written only by the platform, through the function
-- below: no club-side write policy, because a club setting its own licence
-- is not a feature.
create policy club_licence_select on club_licence
  for select using (club_id in (select app_member_club_ids()));

-- ------------------------------------------------------- set_club_licence

create or replace function set_club_licence(
  p_club_id   uuid,
  p_starts_on date,
  p_ends_on   date,
  p_state     text default 'active',
  p_fee_cents bigint default null,
  p_currency  text default 'AUD',
  p_note      text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not app_is_platform() then
    raise exception 'Not a platform administrator.' using errcode = '42501';
  end if;

  if p_state not in ('trial','active','suspended','ended') then
    raise exception 'Not a licence state: %', p_state using errcode = '22023';
  end if;

  insert into club_licence (club_id, starts_on, ends_on, state, fee_cents, currency, note)
  values (p_club_id, p_starts_on, p_ends_on, p_state, p_fee_cents,
          coalesce(p_currency, 'AUD'), nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (club_id, starts_on) do update
    set ends_on   = excluded.ends_on,
        state     = excluded.state,
        fee_cents = excluded.fee_cents,
        currency  = excluded.currency,
        note      = coalesce(excluded.note, club_licence.note)
  returning id into v_id;

  insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
  values (p_club_id, 'licence.recorded', 'club_licence', v_id, auth.uid(),
          jsonb_build_object('state', p_state, 'starts_on', p_starts_on,
                             'ends_on', p_ends_on, 'fee_cents', p_fee_cents,
                             'currency', p_currency));

  return v_id;
end;
$$;

-- ------------------------------------------------------------ platform view
-- Now carrying the commercial state of each club.

drop function if exists platform_clubs();

create or replace function platform_clubs()
returns table (
  club_id           uuid,
  name              text,
  jurisdiction      text,
  created_at        timestamptz,
  is_demo           boolean,
  admin_count       integer,
  season_count      integer,
  primary_name      text,
  primary_email     text,
  primary_phone     text,
  primary_claimed   boolean,
  secondary_name    text,
  secondary_email   text,
  secondary_phone   text,
  secondary_claimed boolean,
  licence_state     text,
  licence_starts_on date,
  licence_ends_on   date,
  licence_fee_cents bigint,
  licence_currency  text,
  licence_note      text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, c.jurisdiction, c.created_at,
         c.name like '%(DEMO)%',
         (select count(*)::integer from club_membership m
           where m.club_id = c.id and m.role = 'admin'),
         (select count(*)::integer from season s where s.club_id = c.id),
         p.full_name, p.email, p.phone, p.claimed_at is not null,
         s2.full_name, s2.email, s2.phone, s2.claimed_at is not null,
         l.state, l.starts_on, l.ends_on, l.fee_cents, l.currency, l.note
  from club c
  left join club_contact p  on p.club_id  = c.id and p.kind  = 'primary'
  left join club_contact s2 on s2.club_id = c.id and s2.kind = 'secondary'
  -- The most recently started licence, which is the one that describes the
  -- club now. Whether it is *current* is a date comparison the application
  -- makes and tests, rather than a `where` clause here that would hide a
  -- lapsed licence and make an unlicensed club indistinguishable from one
  -- whose term ran out last week.
  left join lateral (
    select * from club_licence cl
     where cl.club_id = c.id
     order by cl.starts_on desc
     limit 1
  ) l on true
  where app_is_platform()
  order by c.created_at
$$;

revoke all on function set_club_licence(uuid, date, date, text, bigint, text, text) from public;
grant execute on function set_club_licence(uuid, date, date, text, bigint, text, text) to authenticated;

comment on table club_licence is
  'What was agreed with a club: a term, a state, and a negotiated fee. '
  'Renewal is a new row, so a club''s commercial history stays answerable.';
