.PHONY: help build up down logs verify clean test

help:
	@echo "DOTREP Makefile Commands:"
	@echo "  make build     - Build all Docker images"
	@echo "  make up        - Start all services"
	@echo "  make down      - Stop all services"
	@echo "  make logs      - Show logs from all services"
	@echo "  make verify    - Verify all assets in MANUS_BUILD_LOG.md"
	@echo "  make test      - Run tests"
	@echo "  make clean     - Clean up containers and volumes"

build:
	cd deploy && docker-compose build

up:
	cd deploy && docker-compose up -d

down:
	cd deploy && docker-compose down

logs:
	cd deploy && docker-compose logs -f

verify:
	@echo "Verifying assets from MANUS_BUILD_LOG.md..."
	@if [ -f MANUS_BUILD_LOG.md ]; then \
		grep -o 'urn:ual:[^ ]*' MANUS_BUILD_LOG.md | while read ual; do \
			echo "Verifying $$ual..."; \
			python scripts/verify_asset.py "$$ual" --edge-url http://localhost:8085 || true; \
		done; \
	else \
		echo "MANUS_BUILD_LOG.md not found"; \
	fi

test:
	cd services/reputation && python tests/test_sybil.py

clean:
	cd deploy && docker-compose down -v
	docker system prune -f

