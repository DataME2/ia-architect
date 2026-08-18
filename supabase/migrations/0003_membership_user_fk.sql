-- Tie club membership to a real auth user.
--
-- Without this a membership row can outlive the account it grants access
-- for, which is a stale grant rather than merely untidy data: the row is
-- what every RLS policy joins through, so an orphan is an access decision
-- nobody can trace back to a person.

alter table club_membership
  add constraint club_membership_user_fk
  foreign key (user_id) references auth.users(id) on delete cascade;
