.PHONY: help mongo postgres down logs ps

help: ## Show available commands
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36mmake %-20s\033[0m %s\n", $$1, $$2}'

mongo: ## Start MongoDB backend stack (Redis + LocalStack + MongoDB + Backend)
	docker compose --profile mongo up -d
	@echo "MongoDB backend stack started. Backend available at http://localhost:8085"
	@echo "Starting frontend with hot reload..."
	npm run dev

postgres: ## Start PostgreSQL backend stack (Redis + LocalStack + PostgreSQL + Backend)
	docker compose --profile postgres up -d
	@echo "PostgreSQL backend stack started. Backend available at http://localhost:8085"
	@echo "Starting frontend with hot reload..."
	npm run dev

test: ## Run tests
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

down: ## Stop all services and remove volumes
	@echo "Stopping Docker services..."
	@docker compose --profile mongo --profile postgres down -v
	@echo "Killing any remaining npm/node processes on port 3000..."
	@lsof -ti :3000 | xargs kill -9 2>/dev/null || true
	@pkill -f "npm run dev" 2>/dev/null || true
	@pkill -f "nodemon.*src" 2>/dev/null || true
	@echo "All services stopped."

logs: ## Show logs from all running services
	docker compose logs -f

ps: ## Show status of all services
	docker compose ps
