# Architecture decision records

Short records of the decisions that shape Digging AI: the context at the time, the decision, and what it costs.

| # | Decision |
|---|---|
| [0001](0001-sheet-as-database.md) | One Google Sheet per campaign is the database |
| [0002](0002-code-rules-llm-judgement.md) | Code for rules, LLM for judgement, quotes verified |
| [0003](0003-approval-bound-to-content.md) | Approval is bound to the exact text (content hash) |
| [0004](0004-gmail-minute-map.md) | Every Gmail reader runs in its own minute |
| [0005](0005-workflows-generated-from-source.md) | n8n workflows are generated from source and tested |
| [0006](0006-python-finder.md) | Contact research lives in Python, not in n8n |
| [0007](0007-campaign-files.md) | Campaign files and playbooks instead of forks |
