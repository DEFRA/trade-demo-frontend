.PHONY: help start debug test test-integration test-watch register-user register-cdp-user stop restart restart-frontend logs ps

help: ## Show available commands
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36mmake %-20s\033[0m %s\n", $$1, $$2}'

start: ## Start MongoDB backend stack (Redis + DEFRA ID stub + LocalStack + MongoDB + Backend)
	@echo "Starting MongoDB backend stack..."
	docker compose --profile world up redis defra-id-stub localstack mongodb trade-demo-backend trade-commodity-codes -d --wait
	@echo ""
	@echo "✓ All services ready:"
	@echo "  - Backend: http://localhost:8085"
	@echo "  - DEFRA ID stub: http://localhost:3200"
	@echo "  - Redis: localhost:6379"
	@echo ""
	@echo "Starting frontend with hot reload..."
	@echo "Logs: tail -f frontend.log"
	export $$(grep -v '^#' .env | grep -v '^$$' | xargs) && npm run dev 2>&1 | tee frontend.log

debug: ## Start MongoDB backend stack in debug mode (debugger pauses on startup)
	@echo "Starting MongoDB backend stack..."
	docker compose --profile world up redis defra-id-stub localstack mongodb trade-demo-backend trade-commodity-codes -d --wait
	@echo ""
	@echo "✓ All services ready:"
	@echo "  - Backend: http://localhost:8085"
	@echo "  - DEFRA ID stub: http://localhost:3200"
	@echo "  - Redis: localhost:6379"
	@echo ""
	@echo "Starting frontend in DEBUG mode..."
	@echo "Debugger listening on 0.0.0.0:9229"
	@echo "Attach your debugger to chrome://inspect or your IDE"
	@echo ""
	export $$(grep -v '^#' .env | grep -v '^$$' | xargs) && npm run dev:debug

test: ## Run unit tests only
	npm test

test-integration: ## Run all tests (unit + integration) with DEFRA ID stub
	npm run test:integration

test-watch: ## Run tests in watch mode
	npm run test:watch

register-user: ## Register a test user with local DEFRA ID stub (required before first login)
	@echo "Registering test user with local DEFRA ID stub..."
	@./scripts/register-test-user.sh | jq '.'

register-cdp-user: ## Register Kai with CDP deployed DEFRA ID stub [dev|test|perf]
	@echo "Registering Kai with CDP DEFRA ID stub (environment: $${ENV:-dev})..."
	@./scripts/register-cdp-test-user.sh $${ENV:-dev} | jq '.'

stop: ## Stop all services and remove volumes
	@echo "Stopping Docker services..."
	@docker compose --profile mongo --profile postgres down -v
	@echo "Killing any remaining npm/node processes on port 3000..."
	@lsof -ti :3000 | xargs kill -9 2>/dev/null || true
	@pkill -f "npm run dev" 2>/dev/null || true
	@pkill -f "nodemon.*src" 2>/dev/null || true
	@echo "All services stopped."

restart: ## Restart frontend with fresh logs
	@echo "Restarting frontend..."
	@lsof -ti :3000 | xargs kill -9 2>/dev/null || true
	@pkill -f "npm run dev" 2>/dev/null || true
	@pkill -f "nodemon.*src" 2>/dev/null || true
	@sleep 1
	@echo "" > frontend.log
	@echo "Starting frontend with fresh log..."
	@echo "View logs: tail -f frontend.log"
	@export $$(grep -v '^#' .env | grep -v '^$$' | xargs) && npm run dev 2>&1 | tee frontend.log

logs: ## Show logs from all running services
	docker compose logs -f

ps: ## Show status of all services
	docker compose ps
