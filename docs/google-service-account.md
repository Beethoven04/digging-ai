# Google service account (lets the finder and n8n read/write the campaign sheet)

The finder (and, if you choose `"sheets_auth": "service_account"`, the n8n workflows) use a **service account**: a robot Google identity with access to exactly one sheet.
No OAuth pop-ups, no access to your Gmail or Drive.

1. Open https://console.cloud.google.com/ (log in as the sheet owner). Top bar → project picker → **New project** → name `digging-ai` → Create.
2. Left menu → **APIs & Services → Library** → search **Google Sheets API** → **Enable**.
3. **APIs & Services → Credentials → + Create credentials → Service account** → name `sheets-bot` → Create and continue → skip roles → Done.
4. Click the new service account → tab **Keys → Add key → Create new key → JSON** → a `.json` file downloads.
5. Move it to `finder/service_account.json` (git-ignored).
6. Copy the service account's email (looks like `sheets-bot@digging-ai.iam.gserviceaccount.com`).
   Open the tracker sheet → **Share** → paste that email → **Editor** → untick "Notify" → Share.
7. Test: `cd finder && .venv/bin/python -m finder sheet-check` → prints tab names and row counts.

To revoke later: delete the key in step 4 or remove the share in step 6.

**For n8n:** create a credential of type *Google Service Account API* with the JSON key's email and private key,
name it as in your campaign file (`credentials.googleApi.name`), put its ID there and set `"sheets_auth": "service_account"`.
Unlike OAuth, it never expires (an OAuth app in Google's "Testing" mode logs you out every 7 days).
