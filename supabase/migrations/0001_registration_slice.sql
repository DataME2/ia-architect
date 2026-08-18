-- Registration slice — schema.
--
-- Realises docs/ea/3_information/1_data-objects.md.
-- Row-Level Security policies are in 0002_rls_policies.sql; this file
-- creates the tables and enables RLS, so no table exists for even a moment
-- without it turned on.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- tenancy

create table club (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- BR52: the privacy framework is per tenant, never assumed platform-wide.
  jurisdiction text not null default 'AU-QLD',
  created_at  timestamptz not null default now()
);

create table season (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references club(id) on delete cascade,
  name       text not null,
  starts_on  date not null,
  ends_on    date not null,
  unique (club_id, name),
  check (ends_on > starts_on)
);

-- Which authenticated user may act for which club, and in what role.
-- The join every RLS policy goes through.
create table club_membership (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references club(id) on delete cascade,
  user_id    uuid not null,
  role       text not null check (role in ('registrar','treasurer','committee','coach','coordinator','admin')),
  created_at timestamptz not null default now(),
  unique (club_id, user_id, role)
);

-- --------------------------------------------------------------- identity

-- person is TENANT-SCOPED. P1 (one Person, many roles) holds within a club;
-- cross-club identity is BR44's matching problem and C14's job, and making
-- this table global would move that problem into the primary key while
-- breaking P5 on the way. See docs/ea/3_information/1_data-objects.md.
create table person (
  id                      uuid primary key default gen_random_uuid(),
  club_id                 uuid not null references club(id) on delete cascade,
  -- BR55: the legal name is what goes to the governing body.
  legal_given_names       text not null check (length(btrim(legal_given_names)) > 0),
  legal_family_name       text not null check (length(btrim(legal_family_name)) > 0),
  legal_name_verified_at  timestamptz,
  -- What the person is actually called. Never submitted externally.
  preferred_name          text,
  date_of_birth           date not null,
  email                   text,
  -- BR56: identification photograph, path into Storage.
  photo_path              text,
  created_at              timestamptz not null default now()
);
create index person_club_dob_idx on person (club_id, date_of_birth);
create index person_club_family_name_idx on person (club_id, lower(legal_family_name));

create table person_role (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references club(id) on delete cascade,
  person_id  uuid not null references person(id) on delete cascade,
  season_id  uuid not null references season(id) on delete cascade,
  role       text not null check (role in ('player','referee','coach','guardian','committee')),
  unique (person_id, season_id, role)
);

-- BR67: two independent flags. Authority ends at 18; contactability need not.
create table guardianship (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references club(id) on delete cascade,
  person_id          uuid not null references person(id) on delete cascade,
  guardian_person_id uuid not null references person(id) on delete cascade,
  is_authority       boolean not null default true,
  is_contact         boolean not null default true,
  unique (person_id, guardian_person_id),
  check (person_id <> guardian_person_id)
);

-- ----------------------------------------------------------- registration

create table registration (
  id                       uuid primary key default gen_random_uuid(),
  club_id                  uuid not null references club(id) on delete cascade,
  person_id                uuid not null references person(id) on delete cascade,
  season_id                uuid not null references season(id) on delete cascade,
  -- BR43: PENDING_EXTERNAL_REGISTRATION is an eligibility gate, not paperwork.
  status                   text not null default 'DRAFT'
    check (status in ('DRAFT','PENDING_DOCUMENTS','PENDING_PAYMENT','PENDING_EXTERNAL_REGISTRATION','COMPLETE')),
  outstanding_amount_cents integer not null default 0,
  created_at               timestamptz not null default now(),
  unique (person_id, season_id)
);

create table registration_document (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references club(id) on delete cascade,
  registration_id uuid not null references registration(id) on delete cascade,
  document_type   text not null,
  storage_path    text,
  required        boolean not null default true,
  provided_at     timestamptz,
  unique (registration_id, document_type)
);

-- BR48/BR56/BR57: one row per purpose, never a boolean column. Three
-- purposes with independent grant, revocation and authority are three
-- lifecycles, and a flag cannot record who granted it or when it ended.
create table consent (
  id                    uuid primary key default gen_random_uuid(),
  club_id               uuid not null references club(id) on delete cascade,
  person_id             uuid not null references person(id) on delete cascade,
  purpose               text not null
    check (purpose in ('REGISTRATION_COLLECTION_NOTICE','IDENTIFICATION_PHOTOGRAPH','PUBLICITY')),
  granted_by_person_id  uuid not null references person(id),
  granted_at            timestamptz not null default now(),
  revoked_at            timestamptz,
  -- BR57: publicity is granular per channel and off by default.
  channels              text[] not null default '{}'
);
create index consent_person_purpose_idx on consent (person_id, purpose) where revoked_at is null;

-- Persisted rather than recomputed, so "what was wrong in March?" is a query
-- and question #32's decomposition needs no new instrumentation.
create table validation_result (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references club(id) on delete cascade,
  registration_id uuid not null references registration(id) on delete cascade,
  -- The business rule number, e.g. 'BR55' — not the prose, which can change.
  rule_id         text not null,
  status          text not null check (status in ('pass','fail')),
  message         text not null,
  evaluated_at    timestamptz not null default now()
);
create index validation_result_registration_idx on validation_result (registration_id, evaluated_at desc);

-- ------------------------------------------------------------- submission

-- BR58: immutable and versioned. Never updated after generation.
create table submission_pack (
  id                  uuid primary key default gen_random_uuid(),
  club_id             uuid not null references club(id) on delete cascade,
  season_id           uuid not null references season(id) on delete cascade,
  version             integer not null,
  generated_at        timestamptz not null default now(),
  generated_by_user_id uuid not null,
  storage_path        text not null,
  -- BR59: the channel it was handed over through, recorded against the pack.
  handover_channel    text,
  handed_over_at      timestamptz,
  unique (club_id, season_id, version)
);

-- BR60: the table that keeps *sent* and *registered* apart.
create table submission_record (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references club(id) on delete cascade,
  submission_pack_id uuid not null references submission_pack(id) on delete cascade,
  person_id          uuid not null references person(id) on delete cascade,
  state              text not null default 'sent'
    check (state in ('sent','confirmed_present','rejected')),
  -- Recorded verbatim: over a season these reconstruct the validation
  -- specification the club was never given (question #44).
  rejection_reason   text,
  updated_at         timestamptz not null default now(),
  unique (submission_pack_id, person_id)
);

-- ------------------------------------------------------------------ audit

-- Append-only. No update or delete grant, including for service roles.
create table audit_event (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references club(id) on delete cascade,
  actor_user_id uuid,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  detail      jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index audit_event_club_time_idx on audit_event (club_id, occurred_at desc);

-- ------------------------------------------------------- enable RLS on all
-- Enabled here, in the same migration that creates the tables, so no table
-- ever exists with RLS off. Policies follow in 0002.

alter table club                  enable row level security;
alter table season                enable row level security;
alter table club_membership       enable row level security;
alter table person                enable row level security;
alter table person_role           enable row level security;
alter table guardianship          enable row level security;
alter table registration          enable row level security;
alter table registration_document enable row level security;
alter table consent               enable row level security;
alter table validation_result     enable row level security;
alter table submission_pack       enable row level security;
alter table submission_record     enable row level security;
alter table audit_event           enable row level security;
