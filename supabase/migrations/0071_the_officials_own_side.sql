-- 0071 — The official's own side (scope 75; BR160).
--
-- An official signed in as themself could read their appointments (0045),
-- their claims (0057) and their match confirmations (0055), but not the
-- record that decides whether they may be appointed at all: their
-- classification (BR8, BR110), their accreditations (BR10, BR111) and their
-- Blue Card (BR19, BR54). Those were the coordinator's and registrar's only,
-- so the Referee workspace said "coming soon" where the official's own
-- standing should be.
--
-- Three additive select policies, each for the caller's own Person and
-- nobody else's (`app_my_person_ids`, 0043): not a guardian's child, since
-- an official under 13 has no workspace of their own (BR63) and the guardian
-- is not asked to manage a classification. The existing officer policies are
-- untouched, and nothing here grants a write.

create policy referee_classification_select_own on referee_classification
  for select using (person_id in (select app_my_person_ids()));

create policy referee_accreditation_select_own on referee_accreditation
  for select using (person_id in (select app_my_person_ids()));

create policy clearance_select_own on clearance
  for select using (person_id in (select app_my_person_ids()));
