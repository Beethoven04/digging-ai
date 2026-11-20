# 0002 · Code for rules, LLM for judgement, quotes verified

**Status:** accepted (October 2026)

**Context.** A cold email that invents a fact about the sender, names the wrong person, or reads as machine-written
costs the sender's reputation. LLMs are good at judging personalisation and bad at counting or remembering facts.

**Decision.** Everything checkable is code: word counts, dates already passed, placeholders, wrong greeting name,
banned phrases, signature leaks, campaign guardrails (regexes from the playbook). The LLM (Gemini Flash, Groq as
fallback on any error) judges what code cannot: is every claim supported by a Profile fact or the company research,
is there one specific reason to contact this person, exactly one ask, a natural voice. It must quote the text for
every finding; a quote that is not in the text is shown as "check manually" instead of being trusted.

**Consequences.** + Rules cannot be hallucinated, and LLM false positives are visible. + Two free-tier providers give
availability without cost. − The owner sometimes overrides LLM false positives (honest "gap" sentences, sources the
model cannot see); `qc_model` records who decided.
