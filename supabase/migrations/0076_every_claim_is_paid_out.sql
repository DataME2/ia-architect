-- 0076 — Every approved claim is paid out (scope 79; BR152 restated).
--
-- The club answered October 2026: a referee claim is never taken as credit
-- toward next season. Every approved claim is paid to the account the
-- official (or, before eighteen, a guardian) nominated (BR161). "Credit"
-- had nowhere automated to land; it now has no reason to.
--
-- `settlement` stays, for the history of a "pay" already recorded, but can
-- no longer say "credit". No row in development says it; one would be
-- converted rather than left meaning something the club has retired. The
-- payout (0072) already pays an unsettled claim, so nothing has to be chosen
-- before a claim can be paid.

update referee_payment_claim set settlement = 'pay' where settlement = 'credit';

alter table referee_payment_claim drop constraint if exists referee_payment_claim_settlement_check;
alter table referee_payment_claim
  add constraint referee_payment_claim_settlement_check
  check (settlement is null or settlement = 'pay');

comment on column referee_payment_claim.settlement is
  'BR152 restated (scope 79): every approved claim is paid out to the '
  'official''s nominated account (BR161). Null and ''pay'' mean the same; '
  '''credit'' is retired.';
