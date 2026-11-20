# 0007 · Campaign files and playbooks instead of forks

**Status:** accepted (November 2026)

**Context.** A second campaign (another country, its own sheet) started as a copy of the whole n8n folder with a few
build switches. Two copies drift: a fix in one is missing in the other.

**Decision.** One codebase. Everything that differs per deployment lives in `campaigns/<name>.json`: workflow name
prefix, timezone, sheet, Sheets auth (OAuth or service account), Telegram chats and prefixes, reply-bot sharing,
schedules, owner identity, credentials, and a **playbook** that tunes the prompts (sender, goal, offer) and adds
guardrails (id, label, regex for code, rule text for the LLM). Prompts use placeholders that the build fills and
refuses to leave empty.

**Consequences.** + A new campaign or a new use case (job search, sales, partnerships) is a JSON file, not a fork.
+ Real campaign files are git-ignored; only `campaigns/example.json` is public. − Prompt wording must stay generic
enough for every playbook; campaign-specific rules belong in guardrails.
