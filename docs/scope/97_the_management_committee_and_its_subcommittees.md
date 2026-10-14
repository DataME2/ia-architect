# Project Scope — The Management Committee and its Sub-committees

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/pitchpeople`.

The product owner set out the committee's shape (October 2026): **the
Management Committee is the President, the Secretary and the Treasurer, with
the IT Manager or the Registrar where a club has one; the rest is
sub-committee, each with their own role.** Until now the governance screen
listed one flat committee of eight positions, and "Committee member" and
"Subcommittee member" sat beside the President as if they were the same
body. This initiative splits them and names what each sub-committee member
does.

It also answers the second half of the request about the Management
Committee Hub: a club with Microsoft 365 already has an alternative to
platform storage (BR168, [scope 81](./81_the_management_committee_hub.md)),
and the default stays the platform's own Supabase storage. Both choices are
now stated plainly where the IT Manager chooses.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** Serves the governance capability already in place |
| 2_business    | **BR175 added**: the Management Committee and the sub-committees. Glossary gains *Management Committee* and *Sub-committee*. BR85, BR87, BR88, BR153, BR166 and BR167 are unchanged: an office is still held for one term, confirmed the same way, and carries the same access |
| 3_information | `committee_position` gains `subcommittee` and `role_title` (0092). For a management office both stay null; for a sub-committee position the sub-committee is named. One person may sit on two sub-committees in the same term |
| 4_application | `committeeBody()` and `MANAGEMENT_OFFICES` in `src/domain/governance/term.ts`. The governance screen shows the Management Committee and each sub-committee as separate groups. The appoint and edit forms ask for the sub-committee and role. The committee workspace and the rail say which body a person sits on. The Hub's storage choice is labelled for what it is |
| 5_technology  | Migration 0092 and RLS suite 92 |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | One flat list per term. Nothing distinguishes the President from a fundraising volunteer except the word in the Position column. A sub-committee has no name, and its members have no role |
| **Target** | Per term: **Management Committee** (President, Secretary, Treasurer, and the IT Manager and Registrar where held), then each **sub-committee** by name, every member with their role ("Junior football · Coordinator"). The officers still required are the three; the IT Manager and the Registrar are optional and never flagged vacant |

## Work packages and deliverables

### WP1 — The rule and the data (BR175, 0092)

- **Deliverables:**
  - BR175 in [`5_domain-context-and-rules.md`](../ea/2_business/5_domain-context-and-rules.md).
  - `supabase/migrations/0092_the_management_committee_and_its_subcommittees.sql`:
    - `subcommittee` and `role_title` columns, each a trimmed 2–60 characters;
    - a check that a management office carries neither;
    - the unique key widened to `(term, person, position, sub-committee)`;
    - the receipt.
  - `supabase/tests/92_the_management_committee_and_its_subcommittees.sql`.
- **Outcome:** the database refuses a President "on the Fundraising sub-committee", and accepts one person on two sub-committees.

### WP2 — The domain and the screens

- **Deliverables:**
  - `src/domain/governance/term.ts`: `MANAGEMENT_OFFICES`, `committeeBody()`, and `subcommitteeGroups()`, which groups serving members by sub-committee, unnamed ones last (tested).
  - `src/app/registrar/governance/page.tsx` and `GovernanceForms.tsx`: the two-part table, plus sub-committee and role fields that appear only for a sub-committee position, with a list of the sub-committees already named this term.
  - `src/data/governance.ts`: reads and writes the two fields.
  - `src/app/me/_workspaces/CommitteeWorkspace.tsx` and `src/data/me.ts`: the rail's scope reads "Management Committee · Secretary" or "Junior football · Coordinator".
- **Outcome:** anyone can tell at a glance who governs and who helps.

### WP3 — The Hub's storage, named for what it is

- **Deliverables:** `src/app/registrar/committee-hub/HubForms.tsx` and `page.tsx` name the two choices: **PitchPeople storage (default, held privately in Supabase)** or **the club's Microsoft 365 (SharePoint or OneDrive for Business)**.
- **Outcome:** the alternative the club asked for is visible where it is chosen.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Splitting the two bodies, naming sub-committees and roles | Changing who reads the Hub (question 84) |
| BR175, 0092, suite 92 | A sub-committee's own resolutions, Hub or budget |
| Labelling the Hub's storage choice | Uploading straight into SharePoint through Microsoft Graph |

## Gap notes

- **Uploading into SharePoint directly.** Link mode works today with no
  secret held by the platform. Direct upload needs the club's Microsoft 365
  administrator to approve an app registration, and a per-club credential
  kept in Supabase Vault. The [SharePoint integration annex](../annexes/sharepoint-integration.md)
  lists what it needs. It is worth doing once a club asks for it, not before.
- **Sub-committees are names, not records.** Free text with suggestions
  groups members correctly. A sub-committee table becomes worth having the
  day a sub-committee needs something of its own: a budget, a Hub folder,
  its own resolutions.

## Open questions

- **83: Is the Vice-president on the Management Committee?** The request
  lists President, Secretary, Treasurer, and IT Manager or Registrar.
  Adopted: **no**, so the Vice-president sits on a sub-committee. The
  office keeps its administrator access (BR153), so this changes where it
  is listed, not what it may do.
- **84: Do sub-committee members read the Management Committee Hub?**
  Adopted: **unchanged**. BR168 lets any live committee position read the
  Hub, sub-committee positions included. Restricting it to the Management
  Committee is a one-line change in `app_reads_committee_hub` once decided.
