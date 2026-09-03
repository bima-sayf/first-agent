# Documentation standards

Where a document belongs in this project, and when not to write one. Applies to humans and agents
equally.

## The four rules

1. **Summaries go in `docs/changelogs/`.** Anything describing work that is finished — a cleanup
   report, a phase completion, a migration write-up — is history. It does not belong at the root or
   loose in `docs/`.
2. **Keep `docs/` tidy.** Only current-state guides live there: how something works *now*, how to do
   something *today*. No noise, no duplicate summaries, no superseded plans.
3. **Navigate by `PROJECT-CONTEXT.md` and `docs/INDEX.md`.** Those two are the entry points. If a new
   document is not reachable from `INDEX.md`, it is lost.
4. **Only current-state documents live outside `changelogs/`.** If it describes the past, move it.

## Root level

Exactly two markdown files:

| file | purpose |
|---|---|
| `README.md` | overview and quickstart |
| `PROJECT-CONTEXT.md` | architecture and verified technical facts |

Everything else goes in `docs/`.

## `docs/` — current-state guides

| file | purpose |
|---|---|
| `INDEX.md` | navigation — every doc reachable from here |
| `DOCUMENTATION-STANDARDS.md` | this file |
| `BACKLOGS.md` | open work only. Shipped items move to `changelogs/` |
| `QUICK-START.md` · `TROUBLESHOOTING.md` · `PRIVACY-MODE-GUIDE.md` | how-to guides |
| `IMPLEMENTATION-PLAN-*.md` | a plan that is still being executed. Once shipped, move it to `changelogs/` with a HISTORICAL banner |

## `docs/changelogs/` — history

Naming: **`{context}-{date}-{detail}.md`**, context first so the directory is scannable.

```
cleanup-2026-09-02-initial-state.md
features-shipped-history.md          # rolling log, newest first
```

Context first, not date first: `cleanup-2026-09-02-…` sorts and reads better than
`2026-09-02-cleanup-…` when you are looking for a kind of change rather than a day.

## When *not* to write a document

This is the rule that gets broken most.

**Do not write a summary document for routine work.** A bug fix, a small feature, a refactor — the
commit message is the record. A new markdown file for every change produces exactly the sprawl these
rules exist to prevent.

Write a changelog entry only when:

- a phase or milestone completes
- a migration or restructure happens that a future reader would be confused by
- something shipped that changes how the project is operated

Before creating a file, in order:

1. Does this describe current state? → update the existing guide in `docs/`, or add one.
2. Is it a completion summary? → dated file in `docs/changelogs/`.
3. Is it superseded planning? → `docs/changelogs/` with a HISTORICAL banner at the top.
4. Does it duplicate something that exists? → update that instead.
5. Still unsure? → do not create it. Put it in the commit message.

## Agent behaviour

**At session start:** read `PROJECT-CONTEXT.md`, then `docs/INDEX.md`, then `docs/BACKLOGS.md` if
touching behaviour.

**During work:** use existing docs as reference. Do not open a new summary file mid-task.

**At the end:**
- routine change → no new document
- milestone → one dated entry in `docs/changelogs/`
- structure changed → update `docs/INDEX.md`
- facts changed → update `PROJECT-CONTEXT.md`

**When a backlog item ships:** move it out of `BACKLOGS.md` into
`docs/changelogs/features-shipped-history.md` with the reasoning. Do not leave shipped items sitting
in the backlog — a backlog that lists finished work stops being trusted.

**Keep claims verifiable.** Do not write "all tests pass" or quote a metric without having run the
thing. If a number appears in a doc, it should have come from a command, and stale numbers are worse
than absent ones.

## Current compliance

- root: 2 markdown files ✅
- `docs/`: current-state guides + INDEX + BACKLOGS + this file
- `docs/changelogs/`: history, context-first names
