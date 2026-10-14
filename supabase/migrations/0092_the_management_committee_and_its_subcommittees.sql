-- 0092 — The Management Committee and its sub-committees (scope 97, BR175).
--
-- The product owner's shape of the club: the Management Committee is the
-- President, the Secretary and the Treasurer, with the IT Manager and the
-- Registrar where the club holds those offices; every other position
-- (Vice-president, Committee member, Subcommittee member) belongs to a
-- named sub-committee, and its holder has a role in it.
--
-- Which body a position belongs to is decided by the position itself, so
-- it is derived (`committeeBody` in src/domain/governance/term.ts), never
-- stored twice. What is new is the two facts a sub-committee position
-- carries and a management office does not: the sub-committee's name, and
-- the member's role in it.
--
-- Nullable rather than required for a sub-committee position: positions
-- recorded before today have neither, and a migration that invented a
-- sub-committee for them would be writing the club's minutes for it. The
-- screen asks for the name on every new one.

alter table committee_position
  add column subcommittee text,
  add column role_title   text;

alter table committee_position
  add constraint committee_position_subcommittee_shape
    check (subcommittee is null or char_length(btrim(subcommittee)) between 2 and 60),
  add constraint committee_position_role_title_shape
    check (role_title is null or char_length(btrim(role_title)) between 2 and 60),
  -- A management office is not on a sub-committee, and holds no other role
  -- than the office itself: "President, Fundraising sub-committee" is a
  -- second position, recorded as one.
  add constraint committee_position_management_office_has_no_subcommittee
    check (
      position not in ('president', 'secretary', 'treasurer', 'it-manager', 'registrar')
      or (subcommittee is null and role_title is null)
    );

-- One person may sit on two sub-committees in the same term — Junior
-- football and Fundraising — as a Committee member of each. The key was
-- (term, person, position), which refused the second. Same name kept, so
-- src/data/governance.ts's "already hold that position" message still
-- matches; case and surrounding space do not make a second sub-committee.
alter table committee_position
  drop constraint committee_position_term_id_person_id_position_key;

create unique index committee_position_term_id_person_id_position_key
  on committee_position (term_id, person_id, position, coalesce(lower(btrim(subcommittee)), ''));

comment on column committee_position.subcommittee is
  'BR175: the sub-committee a non-management position belongs to ("Junior football"). Null for a management office, and for positions recorded before 0092.';
comment on column committee_position.role_title is
  'BR175: the member''s role within their sub-committee ("Coordinator"). Null for a management office.';

insert into schema_migration_log (version, name) values
  ('0092', '0092_the_management_committee_and_its_subcommittees');
