# 0005 · n8n workflows are generated from source and tested

**Status:** accepted (October 2026)

**Context.** Workflows edited in the n8n UI cannot be reviewed, diffed or tested, and the same helper code would be
copied into dozens of Code nodes.

**Decision.** One JavaScript file per workflow (one section per Code node) plus Markdown prompts; `build.py` wires the
nodes, injects shared helpers and campaign values, validates the graph and writes importable JSON. An end-to-end
test runs every Code node in order against a demo sheet with mocked APIs; changed workflows also run in a real n8n
container against a mock of every API before deployment.

**Consequences.** + Code review, CI and refactoring work as in any codebase. + One fix reaches every node that uses a
helper. − Nobody may "quickly fix" a node in the UI: the next build would overwrite it.
