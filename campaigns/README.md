# Campaigns

A campaign is one outreach effort: one sender, one goal, one Google Sheet, one set of eight n8n workflows. Everything
that differs between campaigns lives in a JSON file here; the code in `n8n/` is shared.

```bash
cp campaigns/example.json campaigns/acme.json     # real campaign files are git-ignored
make build CAMPAIGN=campaigns/acme.json           # → n8n/workflows/0…7_*.json, ready to import
```

Only [`example.json`](example.json) is public. It is the demo campaign the tests run against (a fictional sender,
"Alex Morgan", looking for a thesis position).

## Fields

| Field | Required | Meaning |
|---|---|---|
| `name` | yes | Prefix of every workflow name (`Digging AI · Sender`). Use a different name per campaign on the same n8n. |
| `timezone` | yes | IANA zone for schedules, the send window and dates in emails (`Europe/Stockholm`). |
| `sheet_id` | yes | The campaign sheet ([schema](../docs/sheet-schema.md)). |
| `sheets_auth` | no | `oauth` (default) or `service_account` (needs credential `googleApi`; never expires). |
| `error_workflow_id` | after first import | ID of the imported `0 · Error handler`; every other workflow reports crashes to it. |
| `telegram.chat_id` | yes | Chat of bot 1 (sends, problems, daily report). |
| `telegram.reply_bot_chat_id` | no | Chat of bot 2 if different. Only this chat can press ✅. |
| `telegram.message_prefix` | no | Text before every Telegram message, e.g. `🇳🇱 NL · ` when campaigns share a chat. |
| `reply_bot.callback_prefix` | no | Prefix on this campaign's card buttons when it shares the reply bot with another campaign. |
| `reply_bot.forward` | no | On the campaign that owns the reply bot: `{url, callback_prefix, command, mark}` of the other campaign; matching updates are forwarded to its webhook. |
| `reply_bot.webhook_path`, `reply_bot.command` | no | On the other campaign: receive forwarded updates at this webhook path; strip this command (e.g. `/nl`) from typed commands. |
| `schedules` | no | Cron overrides by workflow: `qc`, `sender`, `replies`, `followups`, `report`, `assistant`, `sync`. Keep Gmail readers in separate minutes. |
| `owner.name` | yes | Sender name; used in prompts and as the default From name. |
| `owner.from_email`, `owner.other_emails` | yes | Sending account and the owner's other addresses (never treated as a contact). |
| `owner.signature_leak_regex` | yes | Catches the owner's contact details inside a body (the signature is added automatically). |
| `playbook.goal` | yes | Completes "*name*, who …" in every prompt: what the sender wants. |
| `playbook.offer` | yes | What an intro email to a referred person proposes. |
| `playbook.intro_subject` | no | Subject for intro emails when the LLM gives none; `{name}` = who referred. |
| `playbook.guardrails` | no | `[{id, label, regex, rule}]`: `regex` blocks the email in code (`label` is the reason shown), `rule` is told to the LLM, which reports broken ones by `id`. |
| `playbook.style_tells` | no | Extra phrases that make a cold email read as a template (lower case). |
| `credentials` | yes | n8n credential `{id, name}` per slot: `googleSheetsOAuth2Api`, `googleApi`, `gmailOAuth2`, `telegramApi`, `telegramApi_replybot`, `httpHeaderAuth_gemini`, `httpHeaderAuth_groq`. |

## Playbooks for other use cases

The engine is not tied to job search. A B2B sales campaign changes the playbook, not the code:

```json
"playbook": {
  "goal": "runs a two-person studio that builds AI customer-service agents for Nordic e-commerce shops",
  "offer": "a 20-minute call to look at their support inbox and where an agent would save time",
  "intro_subject": "{name} suggested I contact you",
  "guardrails": [
    {"id": "pricing", "label": "Mentions price or discount", "regex": "\\b(discount|% off|free trial|price|pricing)\\b",
     "rule": "Never mention prices, discounts or free trials in a first email."},
    {"id": "guarantee", "label": "Promises results", "regex": "\\b(guarantee[ds]?|100 ?%)\\b",
     "rule": "Never promise or guarantee results."}
  ]
}
```
Profile facts then describe the studio's real work, and the Companies tab holds the research on each shop.
