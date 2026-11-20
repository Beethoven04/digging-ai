# 0004 · Every Gmail reader runs in its own minute

**Status:** accepted (12 October 2026, after an incident)

**Context.** On 12 Oct 2026 the Sender was auto-paused by a Gmail 403 "Units per minute per user": the reply watcher
read 50 threads in the same minute as a send. It was not a daily quota.

**Decision.** Fixed minute slots: Sender :x0/:x5 (+ up to 60 s jitter), reply watcher :02/:17/:32/:47, sync :38 (and
it skips the hour if a send is in progress). Thread reads are batched (5 per second), sync reads one email per
400 ms, searches return ids only. A second campaign on the same Gmail account offsets its schedules.

**Consequences.** + Sends and bulk reads never compete for the same minute. − Schedules are part of the design: changing one means checking the map.
