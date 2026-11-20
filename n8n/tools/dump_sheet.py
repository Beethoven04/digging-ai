"""Dump a campaign sheet to JSON (same shape as tests/sheet_fixture.demo.json) for qc_local.js / sender_sim.js.

Usage:  python n8n/tools/dump_sheet.py campaigns/acme.json out.json [service_account.json]
Needs gspread and a Google service account that can read the sheet (docs/google-service-account.md).
"""
import json
import os
import sys

import gspread

TABS = ['Config', 'Contacts', 'Messages', 'Replies', 'Profile', 'Companies', 'Log']


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    campaign, out = sys.argv[1], sys.argv[2]
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sa = sys.argv[3] if len(sys.argv) > 3 else os.path.join(root, 'finder', 'service_account.json')
    sheet = gspread.service_account(filename=sa).open_by_key(json.load(open(campaign))['sheet_id'])
    tabs = {t: sheet.worksheet(t).get_all_values(value_render_option='UNFORMATTED_VALUE') for t in TABS}
    json.dump(tabs, open(out, 'w'), ensure_ascii=False)
    print({k: len(v) for k, v in tabs.items()})


if __name__ == '__main__':
    main()
