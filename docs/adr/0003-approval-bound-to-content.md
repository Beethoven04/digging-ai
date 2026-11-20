# 0003 · Approval is bound to the exact text

**Status:** accepted (October 2026)

**Context.** An approval tick that survives an edit would let an unchecked text go out. A Telegram card pressed after
the draft was rewritten would send the wrong version.

**Decision.** QC stores a content hash of subject + body. The Sender only sends a row that is approved *and* whose
current hash equals the QC hash; editing the text clears the approval and re-runs QC. Reply-bot cards carry a draft
version; ✅ on a card that is not the newest version is refused.

**Consequences.** + What the owner approved is exactly what leaves. − Bulk text changes (for example a new date line
in every unsent email) need the new hash written with them, or every approval is lost (`n8n/tools/content_hash.js`).
