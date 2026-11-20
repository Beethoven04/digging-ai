# 0006 · Contact research lives in Python, not in n8n

**Status:** accepted (November 2026); replaces the n8n workflow "Find & verify emails"

**Context.** The first version had an n8n workflow that asked Hunter for an address, checked MX and verified with
Reoon. The Python finder grew far stronger: it crawls company sites, reads public commit metadata, infers each
company's address format from real staff addresses, triages catch-all domains first, verifies with a self-hosted
SMTP checker and falls back to Reoon for Microsoft 365 (which gives false "invalid" answers to plain SMTP checks).
The second campaign never used the n8n finder.

**Decision.** Research and verification are done by the Python finder only; it pushes verified people into the
sheet. The n8n engine starts at Contacts with `email_status = valid`.

**Consequences.** + One research path, easier to reason about and to test (unit tests in `finder/tests/`).
+ Paid-per-call APIs are optional. − Research is a step the operator runs (or schedules) outside n8n.
