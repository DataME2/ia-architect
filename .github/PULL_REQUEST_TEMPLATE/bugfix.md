<!--
  Bug-fix template — the named alternate in .github/PULL_REQUEST_TEMPLATE/.
  It does NOT auto-fill; open the PR with ?template=bugfix.md (or let the
  pr-description skill pick it). GitHub requires named alternates to live in
  this directory while the auto-filled default lives at
  .github/pull_request_template.md — that's why the two sit in different
  places.

  Use this only for changes that correct incorrect behavior WITHOUT changing
  any documented behavior. If this change adds or changes behavior instead,
  close this and start the PR again with the default template
  (.github/pull_request_template.md).

  Still describe the WHOLE branch, not just the latest commit:
    git log --oneline main..HEAD
    git diff main...HEAD --stat
  Keep this body updated as the branch gains commits.
-->

## Bug

<!-- What was broken, how it was observed (error, wrong output, failing
     test), and since when if known. -->

## Root cause

<!-- Why it happened — the actual defect, not just where the symptom
     showed up. -->

## Fix

<!-- What changed, and why this is the correct fix rather than a
     workaround around the real cause. -->

## Regression coverage

<!-- The test that would have caught this, added or updated. If no test
     was added, say why (e.g. the class of bug isn't unit-testable) — not
     adding one silently isn't an option. -->

## Verification

<!-- Commands run and their results (lint / typecheck / tests / build),
     plus manual reproduction of the original bug and confirmation it's
     gone. -->

## Scope document

<!-- Confirm this changes no documented behavior: "pure bug fix — no scope
     document." If implementing the fix turned out to require a documented
     behavior change after all, this isn't a pure bug fix — switch to the
     default PR template and follow the ea-first-change process instead. -->
