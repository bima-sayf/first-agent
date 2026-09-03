# Shipped features

Rolling log of what shipped, newest first. Moved out of `docs/BACKLOGS.md` so the backlog lists only
open work.

For the current backlog see [`../BACKLOGS.md`](../BACKLOGS.md).

---

## 2026-09-01

### UX-005 — Bot account mode
Bot runs as @reysablue_bot (Reysa) rather than a personal account, so it is visibly a bot and is
governed by the Bot API rather than a user session.

### UX-004 — Group chat support
Works in Telegram groups, with conversation history kept separately per chat id. History is
in-memory, so it does not survive a restart — that gap is tracked as PERS-001.

### SEC-002 — Environment variable validation
Startup validation with explicit messages for missing or malformed configuration, instead of failing
at first use with an opaque error.

Known consequence, found 2026-09-03: the validation runs at **module import time** and requires the
Telegram credentials, which blocks importing the LLM core from any non-Telegram entry point such as a
local shell. Addressed in
[`../IMPLEMENTATION-PLAN-codeviz-knowledge.md`](../IMPLEMENTATION-PLAN-codeviz-knowledge.md).

### SEC-001 — Secure session file handling
Session files get restrictive permissions (`600` for files, `700` for the directory, set by
`scripts/entrypoint.sh`) and are git-ignored, so bot credentials cannot be committed.

### CRIT-001 — Telethon event loop conflicts
Fixed a fatal asyncio event loop error that crashed the bot.

---

## Earlier

Initial cleanup to the v1.0 production layout is recorded in
[`cleanup-2026-09-02-initial-state.md`](cleanup-2026-09-02-initial-state.md).
