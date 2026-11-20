#!/usr/bin/env bash
# Privacy scan: fails if a tracked or staged file is a private path or contains a secret / personal identifier.
#   scripts/privacy_check.sh            scan everything git would publish (tracked + staged + untracked, not ignored)
# Runs in CI on every push and should run before every commit.
# Personal identifiers (sheet IDs, chat IDs, addresses, phone) are listed one regex per line in the git-ignored
# file .privacy-patterns, so the list itself is never published.
set -euo pipefail
cd "$(dirname "$0")/.."

red() { printf "\033[31m%s\033[0m\n" "$*"; }
grn() { printf "\033[32m%s\033[0m\n" "$*"; }

FILES=$( { git ls-files; git ls-files --others --exclude-standard; } | sort -u)
BAD=0

# 1. private paths that must never be published
for f in $FILES; do
  case "$f" in
    data/*|private/*|roles/*|CLAUDE.md|.privacy-patterns|*.env|campaigns/*.json|*service_account*|n8n/workflows/*|n8n/tests/workflows_mock/*|n8n/tests/sheet_fixture.json)
      [ "$f" = "campaigns/example.json" ] && continue
      red "BLOCKED (private path): $f"; BAD=1 ;;
  esac
done

# 2. secrets (API keys, tokens, private keys) and personal identifiers inside files
PATTERNS='AIza[0-9A-Za-z_-]{30,}|gsk_[0-9A-Za-z]{20,}|ghp_[0-9A-Za-z]{30,}|gho_[0-9A-Za-z]{30,}|xox[bp]-|-----BEGIN (RSA |EC )?PRIVATE KEY|"private_key"|[0-9]{8,10}:AA[0-9A-Za-z_-]{30,}'
if [ -f .privacy-patterns ]; then
  EXTRA=$(grep -v '^#' .privacy-patterns | grep -v '^$' | paste -sd'|' -)
  [ -n "$EXTRA" ] && PATTERNS="$PATTERNS|$EXTRA"
fi
HITS=$(echo "$FILES" | grep -v '^scripts/privacy_check.sh$' | xargs grep -EIl -- "$PATTERNS" 2>/dev/null || true)
if [ -n "$HITS" ]; then
  red "BLOCKED: secret or personal identifier found in:"
  echo "$HITS" | sed 's/^/  /'
  BAD=1
fi

if [ "$BAD" = 1 ]; then
  red "Privacy scan failed. Move the data to a git-ignored place (campaigns/<name>.json, finder/.env) and run again."
  exit 1
fi
grn "privacy scan passed ($(echo "$FILES" | grep -c .) files)"
