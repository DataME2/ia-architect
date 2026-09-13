# Code Commenting and Documentation

_[← Steering](./README.md) · [Application components](../ea/4_application/2_application-components.md)_

**Scope:** what a comment is for in this repository, the commenting
contract per layer, and which directories carry a README and what it must
say. It governs comments and code-adjacent READMEs. Prose under
[`docs/ea/`](../ea/README.md) and [`docs/scope/`](../scope/README.md) is
governed by the `ea-doc-style` and `scope-doc` skills instead.

---

## 1. The rule the rest follows from

**A comment explains what the code cannot: why this, and what goes wrong
otherwise.** The code already says what it does, and it stays true when it
changes — a comment restating it is a second copy that silently rots.

```ts
// Bad — restates the line beneath it, and will outlive its accuracy.
// Loop over the installments and add up the amounts.

// Good — says what the reader could not have known.
// BR74: the instalments must sum to *exactly* the total. An even split
// rarely divides — $120.50 over three is $40.16⅔ — so the remainder lands
// on the first instalment rather than being rounded away a cent at a time.
```

Three corollaries:

- **Cite the rule.** A comment about a compliance behaviour names its
  identifier — `BR74`, `P5`, `decision 11` — because that identifier is the
  join between the running system and
  [the architecture](../ea/2_business/5_domain-context-and-rules.md). Prose
  gets reworded; `BR74` does not.
- **Name the failure the code prevents.** The comments worth having in this
  repository are the ones that say what a plausible-looking alternative
  would have cost: a card reading "Registered" over a child who cannot take
  the field, a policy that is present and wrong.
- **Record the road not taken.** Where an obvious simpler design was
  rejected, the comment says so and why. Otherwise someone "simplifies" it
  back.

**Never leave a commented-out block.** Git has it. Delete it.

**Never write a comment that asserts a state you have not verified** —
"tested", "applied to production", "always non-null". If it is an
assumption, say it is one.

---

## 2. The contract, by layer

| Layer | What every module's header comment carries | Density |
| ----- | ------------------------------------------ | ------- |
| `src/domain/` | The rule or concept, **by identifier**, in the first line; the rationale; what a wrong-but-plausible implementation would cost | Highest. A rule file is read against the EA docs by a human — the comment is half the artifact |
| `src/web/` | What the screen *decides*, and **why the decision is pure** — what a rendered-only version would hide from the tests | High |
| `src/app/` | Only what is not obvious from the render: a `use server` boundary, a redirect's reason, why a value is read on the server | Low. If a `.tsx` needs a paragraph, the decision belongs in `src/web/` |
| `src/data/` | Which client is used and **whether RLS applies** — `createAdminClient` bypasses every policy and every use of it states why it is safe | High at the client boundary |
| `supabase/migrations/` | A banner: the number, the outcome in one line, the scope document and work package, then what is settled here and what was rejected | Highest. A migration is immutable once applied; the comment is the only place to correct the record |
| `supabase/tests/` | What each scenario proves, **stated as the failure it would catch** | High |
| `scripts/` | A module docstring: what it gates, and why it is a gate rather than a lint | High |

### 2.1 Shape

- TypeScript: `/** … */` above the export for module and public-symbol
  documentation; `//` inside a function for a local reason. Markdown
  emphasis inside doc comments is used here and is welcome — it survives
  into editor tooltips.
- SQL: `--` banners. Keep the existing
  `-- ----------- name` separator convention for each function or policy
  group.
- No `@param`/`@returns` boilerplate that repeats the signature. Types are
  the signature documentation; prose is for what types cannot say.
- No attribution, author, or date tags. Git holds those.
- No model or tool identifier anywhere in a comment.

### 2.2 A rule module's header, as the standard

Every file in `src/domain/rules/` is the reference example. It opens with
the identifier and the rule's sentence, then the reasoning, then the
alternatives rejected — see
[`src/domain/rules/br3-outstanding-payment.ts`](../../src/domain/rules/br3-outstanding-payment.ts).
A new rule file that does not follow that shape is not finished.

### 2.3 TODOs

A `TODO` is allowed only with a destination: a scope document, a work
package, or an [open question](../scope/open-questions.md) number.

```ts
// TODO(#57): lawful basis for imported history is unresolved — scope 28 §4.
```

A bare `TODO` is a note to nobody. Prefer recording it as an open question,
which is the mechanism this project already has for exactly this.

---

## 3. READMEs

### 3.1 Which directories carry one

Every directory in the table below carries a `README.md`. **A new top-level
directory under `src/` or `supabase/` carries one from its first commit.**

| Directory | README says |
| --------- | ----------- |
| `src/domain/` | That it is pure and I/O-free, why (`tsconfig.domain.json`, no DOM library), and the map from subfolder to the rules it holds |
| `src/web/` | That it holds the screens' decisions, not their markup, and why that makes them testable by `node --test` |
| `src/app/` | The route map — which path serves which role — and the `use server` conventions |
| `src/data/` | The three Supabase clients and **which of them bypass RLS** |
| `supabase/migrations/` | The ordering rule, the never-edit-an-applied-migration rule, and the policy-in-the-same-migration gate |
| `supabase/tests/` | How the suite is run (`scripts/test_rls.sh`), and that it proves policies *work* where `check_rls.py` proves they *exist* |
| `scripts/` | What each script gates and which CI job runs it |
| Repository root | [README.md](../../README.md) — what the product is, current status, layout, commands |

### 3.2 What a README must contain

Four sections, in this order. Short is correct; a README that competes with
the EA documents will disagree with them.

1. **Purpose** — one paragraph. What lives here and what does not.
2. **Key dependencies** — what this directory depends on, and **what
   depends on it**, each named by path. Upward and downward, because the
   second is what a reader breaks by accident. For `src/domain/`: depends on
   nothing but the standard library; depended on by `src/web/`, `src/data/`
   and `src/app/`. State any constraint that makes a dependency illegal —
   `src/domain/` and `src/web/` may not import React, the Supabase client,
   or anything touching `document`/`window`, and `npm run typecheck`'s
   second pass enforces it.
3. **Layout** — a short table of files or subfolders and what each is for.
4. **Where the architecture lives** — a link to the EA document that
   governs this directory, so the README stays a pointer rather than
   becoming a second source of truth.

### 3.3 Keeping them true

A README is subject to the same definition of done as the code. Adding a
subfolder without adding its row is an incomplete change, and
`python3 scripts/check_links.py` gates only the links, not the claims —
the claims are a review item and an agent's responsibility to re-read
before reporting done.

**The failure mode to watch for is the one this repository has already had
twice:** documentation that describes an earlier state of the system with
complete confidence. The root README said no application code existed
months after it did. When you touch a directory, read its README and ask
whether it is still true — a stale README is a defect, reported as one, not
a tidy-up for later.

---

## 4. What Claude does

- **Write the header comment before the implementation**, for anything in
  `src/domain/`, `src/web/`, or `supabase/migrations/`. If the rationale
  cannot be written, the design is not settled yet.
- **Create the README with the directory**, in the same commit, with all
  four sections of §3.2 filled in.
- **Re-read the README of every directory you touched** before reporting
  work complete, and update it in the same change if it has drifted.
- **Cite the identifier** — `BR`, `P`, decision, scope, work package — in
  every comment about a documented behaviour.
- **Never delete a comment you do not understand.** Find what it refers to.
  It is usually a rule.
- **Never claim a comment or README states something verified unless it
  was.** If a check did not run, the document says so.
