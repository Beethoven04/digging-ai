# Setup guide (about 45 minutes)

You need: a Gmail account for sending, an n8n instance reachable from the internet (the reply bot uses a Telegram
webhook), Python 3.9+ and Node 18+ locally.

## Step 1: Campaign sheet
1. Create a Google Sheet **with the sending Gmail account**, with the tabs and header rows from
   [`sheet-schema.md`](sheet-schema.md) (Config needs every `LAST_RUN_*` row). The fastest way: copy the tabs of
   `n8n/tests/sheet_fixture.demo.json` (the demo campaign) and delete the demo rows.
2. Copy the sheet ID from the URL: `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`.
3. Make tick-boxes: **Messages** column `approved` and **Contacts** column `allow_risky` → *Insert → Checkbox*.
4. Fill **Profile** with true facts about the sender: the QC rejects any claim that is not there.

## Step 2: Google Cloud (Gmail + Sheets)
1. https://console.cloud.google.com → create a project.
2. *APIs & Services → Library*: enable **Gmail API** and **Google Sheets API**.
3. *OAuth consent screen*: External, your Gmail as support email.
   **Then click "Publish app" (status "In production").** In "Testing" mode Google expires the login every 7 days and
   the workflows stop. An unverified app is fine for your own account: at login, click *Advanced → Go to app (unsafe)*.
4. *Credentials → Create credentials → OAuth client ID → Web application*. Authorized redirect URI: copy it from the
   n8n credential window in step 3 (`https://your-n8n.example.com/rest/oauth2-credential/callback`).
5. Optional, recommended for Sheets: a service account instead of OAuth (never expires), see
   [`google-service-account.md`](google-service-account.md).

## Step 3: Credentials in n8n
n8n → *Overview → Credentials → Create*. Use the names from your campaign file (the example uses `Digging AI · …`).

| Campaign key | n8n type | What to enter |
|---|---|---|
| `googleSheetsOAuth2Api` | Google Sheets OAuth2 API | Client ID + secret from step 2 → *Sign in with Google* |
| `googleApi` (only with `"sheets_auth": "service_account"`) | Google Service Account API | Service account email + private key |
| `gmailOAuth2` | Gmail OAuth2 API | Same client ID + secret → sign in with the sending account |
| `telegramApi` | Telegram API | Bot 1 (operations): token from **@BotFather** (`/newbot`) |
| `telegramApi_replybot` | Telegram API | Bot 2 (reply drafts with buttons): a **second** bot from @BotFather |
| `httpHeaderAuth_gemini` | Header Auth | Name `Authorization`, value `Bearer <key>` from https://aistudio.google.com/apikey |
| `httpHeaderAuth_groq` | Header Auth | Name `Authorization`, value `Bearer <gsk_…>` from https://console.groq.com/keys |

After saving each credential, open it again and copy its **ID** from the browser URL (`…/credentials/<ID>`).

**Telegram chat ID:** send any message to the bot, then open `https://api.telegram.org/bot<TOKEN>/getUpdates`. The
number at `"chat":{"id": …}` is the chat ID.

## Step 4: Campaign file and build
1. `cp campaigns/example.json campaigns/<name>.json` (git-ignored) and fill in `sheet_id`, `telegram.chat_id`, the
   credential IDs, `owner` (name, sending address, other addresses, a regex that catches your contact details in a
   body) and the `playbook` (goal, offer, guardrails). Every field: [`campaigns/README.md`](../campaigns/README.md).
2. `make build CAMPAIGN=campaigns/<name>.json` → writes `n8n/workflows/0…7_*.json` with every credential linked.

## Step 5: Import into n8n
1. *Workflows → Create → ⋯ → Import from File* → `0_error_handler.json` → Save. Copy its ID from the URL.
2. Put that ID in the campaign file → `error_workflow_id`, run `make build` again.
3. Import `1_…` to `7_…` the same way and save each. (Re-importing later: delete the old copies first.)
4. Open each workflow → *Settings*: the timezone is the campaign timezone and the error workflow is "… · Error handler".
5. Recommended after testing: *Settings → Save successful executions: Do not save*. Execution logs contain email text.
6. After activating the reply assistant, check `https://api.telegram.org/bot<REPLY_BOT_TOKEN>/getWebhookInfo`: the URL
   must point at your n8n.

**Do not activate anything yet.** Follow [`testing.md`](testing.md) (dry run → test sends → live).

## Step 6: Contacts (Python finder)
```bash
cd finder && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && cp .env.example .env
.venv/bin/python -m finder sheet-check        # service account can read the sheet
```
Then follow [`finder/README.md`](../finder/README.md): `scan` → `run` → `push` writes verified people into Contacts.
Mailbox checks need a [Reacher](../infra/reacher/README.md) instance on a host with outbound port 25.

## What runs when (after activation)
| # | Workflow | Default schedule (campaign timezone) | Does |
|---|---|---|---|
| 0 | Error handler | on any crash | Telegram alert with a fix hint + Log row |
| 1 | Quality check | every 15 min | Code rules + LLM rubric → `ready` / `needs_fix` + quoted reasons |
| 2 | Sender | every 5 min, Mon–Fri 07–18 (window from Config) | One approved email per run, all guards, Gmail "Sent" check first |
| 3 | Reply & bounce watcher | :02 :17 :32 :47 | Classifies replies, cancels follow-ups, holds colleagues, logs referrals |
| 4 | Follow-up drafts | Mon–Fri hourly 07:15–17:15 | fu1/fu2 (≤ 50 words) → QC → your approval |
| 5 | Daily report | every day 18:00 | Three messages: sent table, replies, day summary |
| 6 | Reply assistant | every 5 min + Telegram webhook | Draft answer per reply → card in bot 2 → ✅ sends in the same thread |
| 7 | Gmail ↔ sheet sync | hourly at :38 | Logs emails written by hand, closes what they replace, repairs stuck rows |

Schedules can be changed per campaign (`schedules` in the campaign file). Keep every Gmail reader in its own minute
(see [ADR 0004](adr/0004-gmail-minute-map.md)).

## Free-tier limits (checked October 2026; re-check on the linked pages)
- **Gemini** (primary model): free tier on Flash models. **Free-tier prompts may be used by Google to improve
  products**: drafts and recipient names go to Google. Use a paid key for client data. https://aistudio.google.com/rate-limit
- **Groq** `openai/gpt-oss-120b` (fallback): 30 req/min, 1,000 req/day. https://console.groq.com/settings/limits
- **Reoon** (finder, Microsoft 365 domains): 20 verifications/day free.
- **Gmail**: about 500 recipients/day for consumer accounts; the real risk is spam complaints, so stay low-volume. The
  API also limits quota units per user per minute: that is why each Gmail-reading workflow has its own minute.
