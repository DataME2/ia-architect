-- 0075 — From thirteen, a person decides about their own money and
-- Saturdays (scope 78; question 80 answered (C); BR62, BR152, BR161).
--
-- Scope 73 moved designations and match confirmation to thirteen and left
-- three questions at eighteen because the club had not been asked: who
-- answers Saturday availability (BR62, 0054), who chooses pay or credit on
-- an approved claim (BR152, 0057), and who nominates where it is paid
-- (BR161, 0072). The club answered (C): thirteen for all three.
--
-- All three ask one function, `app_may_answer_designation` (0045), so the
-- line moves in one place and cannot drift between them. From thirteen the
-- person answers for themself; until eighteen every Parent/Guardian holding
-- authority may still answer too. Under thirteen it is the guardian alone,
-- as before (BR63: no account of their own).
--
-- `app_may_answer_as_official` (0069) is now the same set; it stays, so
-- designations keep their own name and their "first answer stands" rule.
-- A player's self-correction (BR148) does not use this function and stays at
-- eighteen.

create or replace function app_may_answer_designation(
  p_person_id uuid, p_club_id uuid, p_as_of date)
returns setof uuid
language sql
stable
set search_path = public, pg_temp
as $$
  select p.id
    from person p
   where p.id = p_person_id
     and p.club_id = p_club_id
     and p.date_of_birth is not null
     and extract(year from age(p_as_of, p.date_of_birth))::integer >= 13
  union
  select g.guardian_person_id
    from guardianship g
   where g.club_id = p_club_id
     and g.person_id = p_person_id
     and g.is_authority
     and not coalesce(app_is_adult_on(p_person_id, p_as_of), false)
$$;

comment on function app_may_answer_designation(uuid, uuid, date) is
  'Who answers for a person (BR62 availability, BR152 pay or credit, BR161 '
  'where paid; BR113 through app_may_answer_as_official): the person from '
  'thirteen, and until eighteen every Parent/Guardian holding authority '
  '(question 80, answered (C), scope 78).';
