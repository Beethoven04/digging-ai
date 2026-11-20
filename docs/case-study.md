# Case study: a master's-thesis search in Skåne, Copenhagen and the Netherlands

Digging AI was built for a real campaign: one person looking for a master's-thesis position at AI companies, from
October to November 2026, first in southern Sweden and Greater Copenhagen, then in the Netherlands as a second
campaign on the same engine. Every email was one-to-one, researched and approved by the sender.

## Accuracy

| Measure | Result |
|---|---|
| Bounce rate on cold emails | **under 0.5 %** in the first campaign (one address, published on a careers page, had been closed since) |
| People found whose address was confirmed by their own mail server | **68 %** |
| People held back because their domain accepts every address (catch-all) or could not be confirmed | 32 %, never sent automatically |
| Confirmed addresses that came from a company format inferred from real staff addresses | 49 % (39 % were published by the person or company, 7 % from Hunter) |
| Confirmed addresses where the plain SMTP check could not answer or was wrong (mostly Microsoft 365), settled by a second verifier | 19 % |
| Emails sent by the engine whose claims were checked against the sender's real profile | all of them: the Sender refuses any text changed since the check |

## What production taught (and what changed in the code)

| Date | What happened | Change |
|---|---|---|
| 8 Oct 2026 | Go-live. | – |
| 10 Oct | Port 25 is blocked on home connections, so SMTP mailbox checks could not run locally. | Verifier runs on a host with outbound port 25 ([`infra/reacher/`](../infra/reacher/)). |
| 10 Oct | Microsoft 365 throttles the second recipient in one SMTP session (`452 4.5.3 Too many recipients`), so a plain check called a real mailbox "invalid" (the person later replied). | "Invalid" on Microsoft 365 domains is re-checked with Reoon; only "valid" from SMTP is trusted as is. |
| 12 Oct | One recipient said the email read as copy-pasted from an AI. | Shorter, plainer emails; the QC got a "natural voice" rule and code checks for semicolons, dashes, bracketed tool lists and known template phrases. |
| 12 Oct | Gmail 403 "Units per minute per user": thread reads and a send in the same minute. | Minute map: every Gmail reader has its own slot ([ADR 0004](adr/0004-gmail-minute-map.md)). |
| 13 Oct | The sender also wrote emails by hand in Gmail; the sheet did not know them. | Gmail-sheet sync every hour, plus a Gmail "Sent" check right before every automatic send. |
| 13 Oct | A typed edit meant for one person's draft landed on another person's card ("Hi Alexander" to Sofia). | The reply bot blocks ✅ when the greeting name does not match the recipient. |
| 14 Oct | The Groq fallback failed with HTTP 400 on one prompt: json mode needs the word "json" in the messages. | The build refuses any prompt without it. |
| 15 Oct | Google OAuth refresh tokens expire after 7 days while the OAuth app is in "Testing" mode; every workflow stopped at "Read sheet". | Sheets can use a service account (never expires); the setup guide says to publish the OAuth app. |
| 30 Oct | Second campaign (Netherlands) started as a copy of the code. | Campaign files and playbooks: one codebase, many campaigns ([ADR 0007](adr/0007-campaign-files.md)). |

## What worked to find the right people
- Company team, about and career "people" pages (for example Teamtailor) and English job ads that name the hiring
  manager.
- Triage of every domain with one random address first: a catch-all domain can never give a confirmed address, so no
  time is spent researching people there.
- At large companies: team leads, engineering managers and heads of data or AI, never the CEO.
- Accuracy over volume: 20 confirmed people beat 50 guesses.
