# Build Journal — Move Skill Execution to Hermes

Started: 2026-06-24

This journal tracks execution of `/Users/ryokobotwin/Desktop/PHASED_BUILD_PLAN.md`.

---

## Phase 1: Strip Execution Logic from Ryoko-Magi-Mainframe

Status: done

Notes:
- Removed `_parse_react_action`, `_ALLOWED_CWD_PREFIXES`, `_ALLOWED_COMMAND_PATTERNS`, `_execute_react_action` from `routes_workers.py`.
- Removed ReAct execution loop from `/akari/chat`; it now forwards messages to the Hermes webhook and returns the raw response.
- Removed unused imports (`re`, `shlex`, `subprocess`).
- Preserved monitoring endpoints: `/akari/health`, `/akari/logs`, and pass-through `/akari/chat`.
- File syntax verified with `py_compile`.

## Phase 2: Configure Hermes/Akari Terminal Working Directory

Status: done

Notes:
- Set `terminal.cwd` in `~/.hermes/profiles/akari/config.yaml` to `/Users/ryokobotwin/Desktop/newsapp/the-daily-ledger`.
- Restarted `ai.hermes.gateway-akari` via `launchctl kickstart -k`.
- Verified gateway health at `https://akari.ryoko.okinawa/health` → `{"status": "ok"}`.

## Phase 3: Rewrite Skill Instructions for Hermes Native Execution

Status: done

Notes:
- Rewrote all 8 skill `SKILL.md` files in `the-daily-ledger/agentskills/` to use direct terminal commands (`npm run ingest:articles` / `npx tsx agentskills/...`).
- Removed backend-specific ReAct JSON action formats, `cd` prefixes, and backend-executor language.
- Synced every `SKILL.md` to `~/Desktop/HomeCookedSkills/` and `~/.hermes/profiles/akari/skills/`.
- Removed stray `.ts` scripts from `HomeCookedSkills` and Akari profile skill folders (canonical scripts stay in `the-daily-ledger`).
- Restarted the Akari gateway to load the updated skills.

## Phase 4: Verify Script Fixes Are Preserved

Status: done

Notes:
- `populate-depropdb.ts` still skips blank lines between metadata lines.
- `backend/scripts/lib/db.ts` still migrates the `importance` column.
- `publish-dailywire.ts` still normalizes `http://` to `https://` in `originalUrl` and defaults `editorialProminence` when importance is missing.
- `rewrite-articles/STYLE.md` still contains the title-case headline rule.

## Phase 5: Test Each Skill Through Hermes Gateway Webhook

Status: pending

Notes:

## Phase 6: Update Documentation

Status: pending

Notes:
