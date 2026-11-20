# Testing

## Automated (CI runs all of this on every push)

| Suite | Command | What it covers |
|---|---|---|
| Workflow build + validation | `make build` | every workflow builds from `src/` + `prompts/`; every Code node passes `node --check`; every `$('Node')` reference exists; no placeholder is left unfilled |
| End-to-end scenario | `make test-n8n` | **147 checks**: every Code node of the built workflows runs in order against a demo campaign sheet (`n8n/tests/sheet_fixture.demo.json`) with mocked Gmail, Sheets, LLM and Telegram |
| Finder unit tests | `make test-finder` | address extraction (plain, obfuscated, Cloudflare), role-address detection, name normalisation, format building and inference |
| Lint | `make lint` | ruff on all Python |
| Privacy scan | `make privacy` | no private path, secret or personal identifier in any publishable file |

The end-to-end scenario covers: QC rules and the LLM fallback, approval reset after edits, every Sender gate (weekend,
window, gap, cap, pause, same company, risky, duplicates, the Gmail "Sent" check), dry run / test / live, Gmail
errors, replies, auto-replies, referrals, bounces, follow-ups in thread, the reply bot (drafts, edits, diff, stale
cards, ✅ guards, hand-answer check), the Gmail ↔ sheet sync (hand-written emails, stuck rows, released holds,
idempotence), the three-message daily report and the error handler.

### Real n8n, mocked APIs
`n8n/tests/mock_server.js` mocks Sheets, Gmail, Gemini/Groq, DNS and Telegram. Changed workflows are imported into a
real n8n container and executed end to end before deployment:
```bash
MOCK_BASE=http://host.docker.internal:8787 python3 n8n/build.py      # → n8n/tests/workflows_mock/
node n8n/tests/mock_server.js &                                      # port 8787
docker run -d --name n8n-digging-test -p 5678:5678 n8nio/n8n         # then import tests/workflows_mock/*.json
n8n/tests/runwf.sh 2                                                 # execute one workflow, per-node summary
```

### Offline tools for a live campaign
- `node n8n/tools/qc_local.js sheet.json`: the real QC rules on a sheet dump (before a batch is approved).
- `node n8n/tools/sender_sim.js sheet.json 2026-11-02T08:40 3`: replays the real Sender pick logic over N days with a
  fake clock (who gets an email when, company spacing, caps). Nothing is sent.
- `python n8n/tools/dump_sheet.py campaigns/<name>.json sheet.json`: the sheet dump these tools read.

## Before go-live (needs real accounts)

### Phase A: dry run (no email leaves)
Config: `DRY_RUN = TRUE`.
1. Execute **1 Quality check** until every draft has a status. ✔ Read `qc_reasons`; fix drafts (they are re-checked).
2. Tick `approved` on 3 rows. Set `WINDOW_START`/`WINDOW_END` around the current time and execute **2 Sender** 3 times.
   ✔ Bot 1 shows "DRY RUN (not sent)" with the full email. ✔ Rows get `dry_run_at`, status stays `ready`.
3. Execute **5 Daily report**. ✔ Three messages arrive together: sent table, replies, day summary.

### Phase B: test sends to yourself
Config: `DRY_RUN = FALSE`, `TEST_RECIPIENT = <your test inbox>`.
1. Execute **2 Sender** 2–3 times. ✔ Emails arrive with subject `[TEST → real@address] …`, correct signature, not in
   spam. ✔ Rows get `test_sent_at`; nothing is marked `sent`.
2. **Full loop with a fake contact** (`C900`, your test inbox as `email`, `valid`, `active`; message `M900`, type
   `cold`): untick every other `approved`, clear `TEST_RECIPIENT`, execute **2** → `M900` `sent` with a thread id.
   - Reply from the test inbox "Sounds good, can we talk Tuesday?" → execute **3** → ✔ `M900` `replied`. Execute **6**
     → ✔ a card in bot 2 says who receives the answer and that it stays in the same conversation. Reply to the card
     "propose Thursday 14:00" → ✔ new card with the change. ✅ → ✔ the answer arrives **in the same thread**.
   - **Hand-written email:** answer the next test reply yourself in Gmail, then press ✅ on its card → ✔ "NOT SENT:
     you already wrote … by hand". Execute **7** → ✔ your email appears in Messages (`qc_model` "sent by hand").
   - A second fake contact without a reply: set its `followup_due` to yesterday → **4** → `M901-FU1` → QC → approve →
     **2** → ✔ arrives in the same thread.
   - Reply "please remove me from your list" → **3** → ✔ contact `do_not_contact`, pending follow-ups `cancelled`.
3. `SENDING_PAUSED = TRUE` → execute **2** → ✔ nothing sent. Set back to FALSE.

### Phase C: live
1. Delete the test rows. Config: `DRY_RUN = FALSE`, `TEST_RECIPIENT` empty, `DAILY_CAP = 10` for the first 2 days.
2. Activate workflows 1–7 (0 runs by itself on errors). Check the reply-bot webhook (`getWebhookInfo`).
3. Day 1: bot 1 shows a message per send and the 18:00 report; bot 2 shows a card per reply.

## Stop rules (pause with `SENDING_PAUSED = TRUE`)
- Bounce rate above 5 % of sent → check verification before continuing.
- More than one "spam / do not contact" complaint → review tone and targeting.
- Gmail shows a warning, CAPTCHA or "unusual activity" → pause 48 h, restart at 5/day.
- The QC model is retired or errors every run → change `LLM_PRIMARY_MODEL` in Config.
