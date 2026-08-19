-- BR58: a pack must answer "did we submit this player, and with what
-- values?" months later.
--
-- It could not. `submission_record` records *who* was in a pack, and
-- `person` holds today's values — so a name corrected after submission
-- would make the pack appear to have carried the corrected one. That is
-- precisely the case BR58 exists for: a disputed eligibility question, long
-- after the fact, where the club's own evidence has to be the values it
-- actually sent.
--
-- The manifest fixes it by storing the frozen rows on the pack. The CSV is a
-- pure function of those rows (src/domain/submission/serialise.ts), so a
-- download months later reproduces the original byte for byte rather than
-- re-deriving it from data that has moved.
--
-- Found while building the submission screen; the same way
-- `legal_name_verified_at` was found while building the rules engine.

alter table submission_pack
  add column manifest jsonb not null default '[]'::jsonb;

comment on column submission_pack.manifest is
  'BR58: the frozen PackRow[] exactly as generated. The pack''s evidence of '
  'what was sent, independent of what person rows say now.';

-- `storage_path` assumed the artifact would live in Storage. It lives in the
-- manifest instead, which keeps it inside the same RLS policies as the rest
-- of the pack rather than needing a second set on a bucket. The column stays
-- for a future archived copy, but it is no longer required.
alter table submission_pack
  alter column storage_path drop not null;

comment on column submission_pack.storage_path is
  'Optional path to an archived copy of the generated file. The authoritative '
  'record of what was sent is the manifest column.';

-- No new policy: submission_pack already has select/insert/handover-update
-- and an explicit no-delete (0002_rls_policies.sql), and those cover the new
-- column. Recorded here so the omission is visibly deliberate rather than
-- overlooked -- a new *table* without a policy is a cross-tenant leak, and
-- the reflex to check should fire on every migration.
