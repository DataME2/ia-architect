<!--
  PR TEMPLATE LAYOUT — why there are two template files in two places:
  GitHub auto-fills a PR body from ONE default template, which must live at
  .github/pull_request_template.md (this file). Named alternates for the
  "choose a template" flow must live in the .github/PULL_REQUEST_TEMPLATE/
  directory — hence the bug-fix template at
  .github/PULL_REQUEST_TEMPLATE/bugfix.md, selected via ?template=bugfix.md.
  The split is required by GitHub, not an oversight. Which one to use:
  CONTRIBUTING.md and the pr-description skill.
-->
<!--
  Describe the WHOLE branch, not just the latest commit:
    git log --oneline main..HEAD
    git diff main...HEAD --stat
  Keep this body updated as the branch gains commits.
-->

## Summary

<!-- 2–4 sentences: what this PR delivers and why. -->

## Scope document

<!-- Link the initiative's docs/scope/N_*.md (added or updated in this PR),
     or state "pure bug fix — no scope document" and why. -->

## EA layers touched

<!-- Mirror the scope document's alignment table; "no change" is a valid,
     explicit verdict for a layer. -->

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    |        |
| 2_business    |        |
| 3_information |        |
| 4_application |        |
| 5_technology  |        |

## Changes

<!-- Everything on the branch, grouped by work package or area — every
     commit's work must be represented here. -->

## Verification

<!-- What was run and what happened: lint / typecheck / tests / build,
     plus any manual or end-to-end checks. -->

## Out of scope / follow-ups

<!-- Deliberate exclusions and the gaps they leave (mirror the scope
     document's gap notes). -->
