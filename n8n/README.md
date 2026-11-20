# n8n workflows

Eight workflows, generated from source for one campaign. Nothing is edited in the n8n UI: change `src/` or
`prompts/`, run `build.py`, run the tests, then import or deploy.

```
src/common.js          helpers injected into every Code node (sheet tables, writer, dates, MIME, Gmail parsing, cards,
                       campaign playbook and guardrails)
src/<workflow>.js      one file per workflow, one section per Code node (// ---- NODE: … / // @node key)
prompts/*.md           LLM system prompts with campaign placeholders ({{SENDER_NAME}}, {{GOAL}}, {{OFFER}}, {{GUARDRAILS}})
build.py               wires nodes + connections, fills campaign values from campaigns/<name>.json → workflows/*.json
tests/e2e.test.js      147 end-to-end checks: every Code node against the demo campaign sheet, APIs mocked
tests/mock_server.js   mock of Sheets, Gmail, Gemini/Groq, DNS and Telegram for a real n8n container
tools/                 offline helpers for a live campaign: qc_local.js, sender_sim.js, content_hash.js, dump_sheet.py
```

## The workflows

| # | Workflow | Source | Default trigger | What it does |
|---|---|---|---|---|
| 0 | Error handler | `error.js` | any crash | Telegram alert with a fix hint + Log row |
| 1 | Quality check (LLM) | `qc.js` | every 15 min | code rules + LLM rubric against Profile and Companies → `ready` / `needs_fix` with quoted reasons |
| 2 | Sender | `sender.js` | every 5 min, Mon–Fri 07–18 | one approved email per run; all guards; Gmail "Sent" check right before sending |
| 3 | Reply & bounce watcher | `replies.js` | :02 :17 :32 :47 | two Gmail searches, then only threads with new mail; classifies, handles referrals and bounces |
| 4 | Follow-up drafts | `followups.js` | Mon–Fri hourly 07:15–17:15 | fu1/fu2 after N days, ≤ 50 words, same thread → back to QC + approval |
| 5 | Daily report | `report.js` | 18:00 | three Telegram messages: sent table, replies, day summary |
| 6 | Reply assistant (bot) | `assistant.js` | every 5 min + Telegram webhook | drafts an answer per reply; second bot with ✅ / ✏️ / 🔁 / ❌ |
| 7 | Gmail ↔ sheet sync | `sync.js` | hourly at :38 | logs emails written by hand, closes what they replace, repairs stuck rows |

```
Contacts (valid, from the finder)
Messages ─▶ [1] ─▶ ready ─▶ ☑ approved ─▶ [2] ─▶ Gmail ─▶ Log + sheet (ids, thread, follow-up date)
Gmail ─▶ [3] ─▶ Replies row ─▶ [6] ─▶ card in bot 2 ─▶ ✅ ─▶ reply in their thread
                            └▶ [4] follow-ups ─▶ [1]
Gmail Sent ─▶ [7] ─▶ Messages (hand-written emails) · held rows released · stuck rows repaired
[2] sends · problems · [5] report · [0] errors ─▶ bot 1
```

## Guards (in code, re-checked on the live sheet every run)
- **Sender (2):** `DRY_RUN`, `SENDING_PAUSED`, `TEST_RECIPIENT`, send days and window, daily cap, minimum gap + jitter,
  no other row in `sending`, approved and unchanged since QC, verified (or explicitly allowed) address, active
  contact, never the same type or the same text twice to an address (Log is append-only), one person per company per
  day, colleagues on hold once someone at the company answered.
- **Gmail "Sent" check (2 and 6):** right before sending, one search `in:sent (to:x OR cc:x) after:<time>`. Any id the
  sheet does not know means the owner wrote by hand: the Sender puts the row on `held` (`manual_check: <ids>`), the
  reply bot closes the draft. If Gmail cannot be searched, nothing is sent that run.
- **Reply bot (6):** only the owner's chat id is obeyed; the card version must match the current text, so an old card
  cannot send; refuses if a later email to the same address is already in the sheet; the card states who receives
  the email (only that address, no CC) and whether it goes into the same Gmail conversation or as a new email.
- **Sync (7):** never runs next to a send (any row in `sending` for < 20 min skips the hour); ignores emails from the
  last 5 minutes (they may still be written by the Sender or the bot); only emails to known contacts are touched.

## What the sync (7) does with an email found in Gmail "Sent"

| Situation | Result |
|---|---|
| already in the sheet without Gmail ids (logged by hand, ±30 min) | ids added to that row |
| a row stuck in `sending` for this address | marked `sent` (the email did go out) |
| first email to this contact, a cold email is queued | the queued row becomes `sent` with the real text; the Sender never sends it |
| the contact replied before | new `Mxxx-Rn` row (`type reply`); open bot drafts it answers are closed and bot 2 is told |
| otherwise (a follow-up by hand) | the queued fu1/fu2 becomes `sent`, or a new follow-up row is added |
| not to a known contact (private email, test inbox) | ignored |

After the emails: rows held by the Gmail check are released once their email is in the sheet; rows stuck in
`sending` ≥ 20 min that are **not** in Gmail Sent go back to `ready` (`awaiting_ok` for bot drafts); queued emails of
contacts set to `do_not_contact` / `bounced` (or follow-ups of `replied` / `referred` / `refused`) are cancelled.

## Gmail API quota
Gmail limits quota units per user per minute. Sending and reading in the same minute caused a 403 on 12 Oct 2026, so:
the Sender fires on :x0/:x5, the reply watcher on :02/:17/:32/:47, the sync on :38. Thread reads are batched
(5 per second), sync reads 1 email per 400 ms, and every search returns ids only.

## Reply assistant (6) without a calendar
The bot never reads a calendar. The drafter gets the usual hours from Config `AVAILABILITY`
(`1-5 09:00-17:00` = Monday to Friday) and `AVAILABILITY_NOTE`. It accepts a time the other person proposes inside
those hours (with "check your calendar" on the card), never invents slots, and leaves anything outside them as an
open question for the owner.

## Config keys used by the newer workflows
| key | default | used by |
|---|---|---|
| `REPLY_DRAFTS_ENABLED`, `REPLY_DRAFTS_SINCE`, `REPLY_DRAFT_BATCH` | TRUE, last 2 days, 4 | 6 |
| `AVAILABILITY`, `AVAILABILITY_NOTE`, `MEETING_MINUTES` | `1-5 09:00-17:00`, empty, 30 | 6 |
| `INBOX_SEARCH`, `INBOX_SEARCH_DAYS` | TRUE, 3 | 3 |
| `SYNC_ENABLED`, `SYNC_FIRST_DAYS`, `SYNC_MAX_FETCH` | TRUE, 3, 40 | 7 |
| `LAST_RUN_DRAFTER`, `LAST_RUN_SYNC` | written automatically | 6, 7, report. **The rows must exist.** |

## Build, test, deploy
```bash
python3 build.py --campaign ../campaigns/<name>.json   # → workflows/0…7_*.json (git-ignored: they contain real ids)
make test-n8n                                          # from the repo root: build the example campaign + 147 checks
```
Real n8n test (before any node or parameter change goes live):
```bash
node tests/mock_server.js &
MOCK_BASE=http://host.docker.internal:8787 MOCK_TG_CRED=mockTgCred000001 python3 build.py   # → tests/workflows_mock/
docker exec n8n-digging-test n8n import:workflow --separate --input=/wf
tests/runwf.sh 2                     # 0…7 = the workflows, 8 = the reply-bot branch of 6
```
Re-importing replaces anything changed in the n8n UI; keep every change in `build.py` / `src/` / `prompts/`.

## Decisions
- **HTTP + Code nodes** instead of the Gmail/Sheets nodes: exact control over MIME and threading headers, fewer
  node-version surprises on a server whose version can change.
- **Gemini Flash primary, Groq `gpt-oss-120b` fallback** on any error: free tiers, a different provider when one is
  overloaded. Model names live in Config.
- **Reply-To = the watched Gmail address**, so every answer lands where the reply watcher can see it.
- **Reuse:** ideas from n8n templates [#7175](https://n8n.io/workflows/7175) (follow-up stages, reply tracking) and
  [#15849](https://n8n.io/workflows/15849) (working-hours guard, daily limit). Not copied: they have no approval,
  dedupe or verification.
