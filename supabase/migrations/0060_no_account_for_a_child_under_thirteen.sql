-- 0060 — No account is linked to a child under thirteen (BR63, scope 68).
--
-- Found in use, September 2026: a guardian's login was linked to her
-- twelve-year-old son from the Access screen's "Whose account is this?"
-- picker — mother and son share a surname and the picker listed every
-- Person by name alone. Signing in, she was shown his player view instead
-- of her family workspace with her children in it.
--
-- BR63 already says a child under thirteen holds no account; nothing in the
-- database said so for `account_person`. A trigger on the table rather than
-- a check in `link_account_to_person`, because four paths write here —
-- that function, and the family, player and staff claims — and one guard
-- in the shared place covers them all, including any added later.
--
-- A birth date recorded as the 1900-01-01 import placeholder is old, not
-- young, so it passes: this refuses what is known to be a child, and does
-- not block an adult whose date nobody has entered yet.

create or replace function assert_account_person_is_not_a_child()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_born date;
begin
  select date_of_birth into v_born from person where id = new.person_id;
  if v_born is not null and v_born > (current_date - interval '13 years')::date then
    raise exception
      'A child under thirteen cannot hold an account of their own (BR63) — link the login to their parent or guardian instead.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger account_person_is_not_a_child
  before insert or update of person_id on account_person
  for each row execute function assert_account_person_is_not_a_child();
