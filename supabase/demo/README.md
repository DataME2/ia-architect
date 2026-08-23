# The demo club

A permanently-seeded club with obviously fictional data, for showing a
prospective club what the product actually does.

## This is not a migration

`supabase/migrations/` runs against production automatically when a change
merges to `main`. **Nothing in this directory may ever move there.** A demo
club appearing in the pilot club's project because a file was relocated is
the failure the warning at the top of `seed.sql` exists to prevent.

These scripts are run deliberately, by hand, against whichever project is
meant to hold a demo.

## Running it

1. Create the demo administrator in Supabase: **Authentication → Users →
   Add user**. Same bootstrap as any tenant, and for the same reason — see
   [the provisioning annex](../../docs/annexes/tenant-provisioning.md).
2. Paste that user's id into `v_admin_user` at the top of `seed.sql`.
3. Run `seed.sql` against the project.
4. To remove it: run `teardown.sql`.

Re-seeding requires a teardown first; the script refuses to run twice so a
half-updated demo is not possible.

## What it demonstrates

Chosen to show the things that are hard to describe in a sentence — a queue
that names *which rule* is blocking a child and *why*.

| In the demo | Shows |
| ----------- | ----- |
| Two Okafor children, one parent | **BR80** — a second child reuses the guardian rather than creating a copy |
| Sofia Marchetti | **BR2** blocking, and naming the missing document rather than saying "documents incomplete" |
| Tomas Kowalski | **BR3** — the fee outstanding with no plan agreed |
| Priya Raman | A payment plan **in arrears** — BR3's message carries the balance *and* the missed instalment, which are two different phone calls |
| Jack O'Sullivan | A voucher **attached and unverified** — **BR81**, nothing off the balance until a human checks the code |
| Lena Fischer | **BR79** — confirmed by the federation, then charged. Looks finished on every other screen and cannot take the field |
| Margaret / Maggie Whitfield | **BR5** — one human recorded twice, surfaced for a person to resolve and never merged automatically |
| Rebecca Lindqvist | A card number recorded but **not verified** — she cannot be added as an official (**BR19**), which is the block working |
| The committee | **BR86** — an AGM three months overdue, and **BR88** — a treasurer with no clearance, surfaced rather than refused |
| `/join/demo-family-link` | The public registration link, live. Writes into the demo club and reads nothing |

Dates are relative to the day it is seeded, so an AGM that is three months
overdue stays three months overdue rather than rotting into eight hundred
days and looking like a bug.

## Rules it obeys, deliberately

- **It is a real tenant.** Not a mode, not a flag, not a bypass — P5
  protects it exactly like any other club. A demo living outside the
  security model would demonstrate a product that does not exist.
- **Every email is on `example.test`**, reserved by RFC 6761, so no address
  here can ever be a real mailbox.
- **Every card and voucher number is visibly fake**, prefixed `DEMO-`.
- **No anonymised production data.** A different and worse idea than
  fiction.
- **Registrations are created by calling `app_create_registration`** — the
  same function both real surfaces use — rather than by hand-writing rows,
  so the demo cannot drift away from real behaviour.
