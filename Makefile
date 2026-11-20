# Digging AI · developer commands. CI runs `make ci`.
CAMPAIGN ?= campaigns/example.json
PYTHON   ?= python3

.PHONY: build test test-n8n test-finder lint privacy ci

build:            ## build the n8n workflows for $(CAMPAIGN) → n8n/workflows/
	$(PYTHON) n8n/build.py --campaign $(CAMPAIGN)

test-n8n:         ## end-to-end scenario: every Code node against the demo sheet (always the example campaign)
	$(PYTHON) n8n/build.py --campaign campaigns/example.json
	cd n8n/tests && npm ci --silent && node e2e.test.js

test-finder:      ## finder unit tests
	$(PYTHON) -m pytest -q

test: test-n8n test-finder

lint:             ## ruff on all Python
	ruff check finder n8n/build.py n8n/tools

privacy:          ## no private path, secret or personal identifier in publishable files
	scripts/privacy_check.sh

ci: privacy lint test
