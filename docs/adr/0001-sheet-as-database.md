# 0001 · One Google Sheet per campaign is the database

**Status:** accepted (October 2026)

**Context.** The owner reviews drafts, ticks approvals, fixes addresses and reads replies every day. n8n workflows and
the Python finder must read and write the same records. A real database would need an admin UI for the owner.

**Decision.** One Google Sheet per campaign with fixed tabs (Config, Contacts, Messages, Replies, Log, Profile,
Companies). Columns are addressed by header name, never by position. Every switch (pause, dry run, test recipient,
caps, window) is a Config row, so changing behaviour never needs a redeploy. The Log tab is append-only and is the
source of truth for "already sent".

**Consequences.** + Zero-UI admin, readable by people, n8n and Python. + Manual edits are safe: the next run re-reads
the sheet. − Sheets API quotas and ~10k-row practical limits; fine for one-to-one outreach (hundreds of contacts per
campaign), not for bulk mail. − No transactions: the Sender locks a row (`sending`) before it sends, and the sync
repairs rows a crash left behind.
