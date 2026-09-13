-- 0029 — A guardian reads what is still missing for their own child.
--
-- 0028 gave a family its own household through `app_my_family_person_ids()`,
-- on the twelve tables the guardian workspace read at the time. It left out
-- `registration_document`, and that omission does not fail loudly: BR2
-- evaluates "which required documents are missing" against the rows the
-- caller can read, so a guardian reading **no** rows was told every document
-- was attached — a false pass, over the exact document a registrar is
-- waiting on. `registration_voucher` is the other half of the fees panel.
--
-- Same shape as 0028's payment policies: additive, reached through the
-- registration the row belongs to, never through club membership. Reads
-- only — a family still writes nothing here.

create policy registration_document_select_family on registration_document
  for select using (
    registration_id in (
      select id from registration where person_id in (select app_my_family_person_ids(club_id))
    )
  );

create policy registration_voucher_select_family on registration_voucher
  for select using (
    registration_id in (
      select id from registration where person_id in (select app_my_family_person_ids(club_id))
    )
  );
