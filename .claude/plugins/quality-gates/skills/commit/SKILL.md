---
name: commit
description: >
  This skill should be used when the user wants to commit code, invokes
  /commit, or asks to create a git commit. Wraps git commit with automated
  quality gates: code review with auto-fix, test suite validation, and
  acceptance criteria checking against the linked GitHub issue. Use
  --skip-gates to bypass all gates for trivial commits.
allowed-tools: Bash(git:*), Bash(pnpm test:*), Bash(gh issue:*), Read, Glob, Grep, Agent, Write, Edit
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Arguments

Parse the user's input for these optional flags:
- `--skip-gates` — Skip all quality gates (1-3), perform a plain commit only
- `-m "message"` — Use this as the commit message instead of auto-generating one

## Task

If `--skip-gates` was provided, skip directly to the **Commit** section below.

Otherwise, execute the following gates in order. If any blocking gate fails,
stop immediately and report the failure. Do not proceed to the commit.

---

### Issue Resolution

Determine the linked GitHub issue number using this fallback chain:

1. **Parse branch name** — Check the current branch name for a leading number.
   Match the pattern `<number>-<slug>` (e.g. `41-quota-vs-ratelimit`,
   `22-sidebar-progress`). Also match prefixed variants: `feat/<number>-*`,
   `fix/<number>-*`, `bugfix/<number>-*`, `hotfix/<number>-*`,
   `chore/<number>-*`, `enhancement/<number>-*`. Extract the number.

2. **Ask the user** — If the branch name doesn't contain an issue number, ask:
   "Is this work linked to a GitHub issue? (enter number or skip)"

If no issue is linked (user says skip, or on `main`), Gate 3 will be
skipped. Record the resolved issue number (or null) for later use.

---

### Gate 1: Code Review + Auto-Fix

**Type:** Advisory with auto-fix. Does not block the commit on its own, but
improves code quality before the remaining gates.

**Step 1:** Dispatch the `pr-review-toolkit:code-reviewer` agent with this prompt:

> Review the unstaged and staged changes shown in the git diff for this
> repository. Focus on: bugs, logic errors, performance issues, code
> duplication, CLAUDE.md convention violations, and security concerns. Only
> report findings with confidence ≥80.

**Step 2:** If the code-reviewer reports Critical (≥90) or Important (≥80)
findings, dispatch the `pr-review-toolkit:code-simplifier` agent with this
prompt:

> The code reviewer found the following issues in the recent changes:
>
> [paste findings here]
>
> Fix these issues in the affected files. Preserve all existing functionality.
> Focus only on the files mentioned in the review findings.

**Step 3:** After the code-simplifier finishes (or if no findings were reported),
show a brief summary:
- If fixes were applied: list what changed
- If no findings: report "Gate 1 passed — no issues found"

Proceed to Gate 2.

---

### Gate 2: Test Suite

**Type:** Blocking. If tests fail, stop and do not commit.

**Step 1:** Run:
```
pnpm test:run
```

**Step 2:** Check the exit code.

- **Exit 0 (pass):** Report "Gate 2 passed — all tests pass" and proceed to
  Gate 3.
- **Exit non-0 (fail):** Report the test failures. State clearly:
  "Gate 2 FAILED — tests did not pass. Commit blocked. Fix the failing tests
  and run /commit again."
  **STOP. Do not proceed.**

---

### Gate 3: Acceptance Criteria

**Type:** Blocking when criteria exist. Skipped when no issue is linked or no
criteria are found.

**If no issue is linked:** Report "Gate 3 skipped — no linked issue" and
proceed to commit.

**If an issue is linked:**

**Step 1:** Dispatch the `quality-gates:acceptance-checker` agent with this
prompt:

> Validate the current code changes against the acceptance criteria for issue
> #[NUMBER]. The issue number is [NUMBER]. Check the issue body and any
> enrichment report comments for acceptance criteria, then cross-reference
> with the current git diff.

**Step 2:** Read the agent's report.

- **GATE RESULT: PASS** — Report "Gate 3 passed — acceptance criteria met" and
  proceed to commit.
- **GATE RESULT: FAIL** — Report which criteria are unmet. State clearly:
  "Gate 3 FAILED — unmet acceptance criteria. Commit blocked. Address the
  unmet criteria and run /commit again."
  **STOP. Do not proceed.**
- **NO_CRITERIA_FOUND** — Report "Gate 3 warning — no acceptance criteria
  defined in issue #[NUMBER]. Proceeding without criteria validation."
  Proceed to commit.

---

### Commit

All gates have passed (or were skipped). Now create the commit.

**Step 1:** Stage the relevant changed files using `git add` with specific file
paths. Do not use `git add -A` or `git add .`.

**Step 2:** Generate the commit message:
- If `-m "message"` was provided, use that message exactly
- Otherwise, generate a concise commit message based on the diff
- Follow the commit message style from the recent commits shown in Context
- If an issue is linked, include the reference (e.g., `feat: add feature (#43)`)

**Step 3:** Create the commit:
```
git commit -m "<message>"
```

**Step 4:** Report success with the commit hash and a summary of which gates
ran and their results.
