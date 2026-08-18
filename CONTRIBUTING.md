# Contributing

## The working method: EA first

This repo practices **architecture-first development**: strategy and
business architecture are validated before information, application, and
technology — and all of it before code. The full process is described in
[docs/scope/README.md](./docs/scope/README.md); in short, for any change in
requirements:

1. **Align the EA** — walk [docs/ea/](./docs/ea/README.md) top-down
   (`1_strategy` → `5_technology`), updating the affected documents.
2. **Document the scope** — add the next-numbered initiative document to
   [docs/scope/](./docs/scope/README.md).
3. **Implement** — keeping docs and code in sync in the same change set.

Bug fixes that change no documented behavior can go straight to step 3.
Agent-oriented guidance for the same process lives in `.claude/skills/`.

## Actors in this process

The process has three roles. Nothing here assumes a human fills the middle
one — an AI agent (e.g. Claude Code, guided by `.claude/skills/`) and a
person follow exactly the same steps, in the same order, against the same
documents:

- **Requester** — whoever wants something to change: a stakeholder, a
  product owner, a bug reporter. Presents a requirement or a problem, not a
  solution or a diff.
- **Agent** — whoever executes the process: a contributor or an AI agent.
  Walks the EA layers, writes the scope document, implements, verifies
  alignment, and opens the PR. "Agent" here names the role, not a
  specific tool — the process doesn't change based on who or what fills it.
- **Reviewer** — approves or requests changes on the PR, confirms any open
  questions the requester needed to weigh in on, and merges.

## Process flow

How a requirement gets from "someone wants a change" to "merged," and
where each actor's responsibility starts and ends:

```mermaid
flowchart TD
  subgraph REQ["Requester"]
    req(["Presents a requirement<br>or reports a problem"])
  end

  subgraph AGENT["Agent (person or AI)"]
    walk["Walk docs/ea/ top-down<br>1_strategy → 5_technology"]
    conflict{"Contradicts an existing<br>Principle?"}
    bugfix{"Pure bug fix — no<br>documented behavior<br>changes?"}
    scopedoc["Write scope document<br>docs/scope/N_*.md"]
    implement["Implement, keeping EA +<br>scope docs true to the code"]
    verify["Verify alignment<br>(ea-first-change, step 4)"]
    openpr["Open PR — default or<br>bugfix template"]
    address["Address review feedback"]
  end

  subgraph REV["Reviewer"]
    review{"Approve?"}
  end

  stop[["Stop — surface the conflict<br>to the requester instead<br>of proceeding"]]
  merged(["Merged"])

  req --> walk --> conflict
  conflict -- yes --> stop
  stop -.->|requester decides how<br>to resolve it| req
  conflict -- no --> bugfix
  bugfix -- yes --> implement
  bugfix -- no --> scopedoc --> implement
  implement --> verify --> openpr --> review
  review -- changes requested --> address --> openpr
  review -- approved --> merged
```

Every arrow into the Agent subgraph is a decision the agent makes
explicitly and records — a "no change" verdict on an EA layer, a "pure bug
fix, no scope document" statement, an open question logged for the
requester — never a silent skip. See `ea-first-change` for the full
step-by-step version of this same flow.

## Pull requests

Pull requests use one of two templates, chosen by what kind of change this
is:

- **`.github/pull_request_template.md`** (default) — for anything that adds
  or changes documented behavior. The body links the scope document, gives
  every EA layer a verdict, and describes **all** changes on the branch
  (`git diff main...HEAD`), not just the latest commit.
- **`.github/PULL_REQUEST_TEMPLATE/bugfix.md`** — for pure bug fixes that
  change no documented behavior: what broke, the root cause, the fix, and
  the regression coverage added, instead of a scope document and EA table.
  Pick it explicitly when opening the PR (GitHub's "Preview" template
  picker, or `?template=bugfix.md` on the compare URL); if the fix turns
  out to touch documented behavior after all, use the default template
  instead.

Either way, the description is kept updated as the branch grows — see the
`pr-description` skill.

## Development workflow

Node 22 or newer. One dependency set, no build step — Node strips
TypeScript types at run time, so the domain and its tests execute directly.

```bash
npm install
npm run check   # typecheck, tests, link check, RLS coverage — CI order
```

Individually:

| Command | What it guards |
| ------- | -------------- |
| `npm run typecheck` | `tsc --noEmit`, strict |
| `npm test` | `node --test` over `src/**/*.test.ts` |
| `python3 scripts/check_links.py` | Every relative Markdown link resolves |
| `python3 scripts/check_rls.py` | **Every table has RLS, a policy, and a `club_id`** |

**Two rules for the code**, both from
[`docs/ea/4_application/2_application-components.md`](./docs/ea/4_application/2_application-components.md):

1. **The rules engine holds no I/O and no framework.** Each business rule is
   a pure function returning an outcome carrying the rule's identifier. That
   keeps BR1–BR68 testable without a database and diffable against
   `5_domain-context-and-rules.md` by a human.
2. **Rule identifiers are the business rule numbers.** A `validation_result`
   row records `BR55`, not `"legal name mismatch"`. Prose gets reworded;
   the identifier is the join between the running system and the
   architecture.

**Never add a table without its RLS policy in the same change.** Principle
P5 is enforced by those policies, and a table without one is a cross-tenant
leak of children's data. `check_rls.py` fails the build for exactly this,
and it is a gate rather than a lint.

## Definition of done

A change is done when:

- the project's verification commands (lint, typecheck, tests, build, or
  whatever this stack defines) pass;
- the affected EA documents ([docs/ea/](./docs/ea/README.md)) still
  describe the system as it now is — services, rules, data objects, and
  their realizations (or explicit "Pending") are up to date;
- the initiative's scope document reflects what was actually delivered;
- cross-links resolve and diagrams render;
- any new interpretation of a requirement is recorded as an open question
  with its adopted interpretation (see the `scope-doc` skill).
