#!/bin/bash
# Development Docker helper script

set -e

case "$1" in
  start)
    echo "🚀 Starting development environment..."
    docker-compose -f docker-compose.dev.yml up --build
    ;;
  
  stop)
    echo "🛑 Stopping development environment..."
    docker-compose -f docker-compose.dev.yml down
    ;;
  
  restart)
    echo "♻️  Restarting development environment..."
    docker-compose -f docker-compose.dev.yml restart app
    ;;
  
  logs)
    docker-compose -f docker-compose.dev.yml logs -f app
    ;;
  
  shell)
    echo "🐚 Opening shell in app container..."
    docker-compose -f docker-compose.dev.yml exec app sh
    ;;
  
  install)
    echo "📦 Installing dependencies..."
    docker-compose -f docker-compose.dev.yml run --rm app npm install
    ;;
  
  test)
    echo "🧪 Running tests..."
    docker-compose -f docker-compose.dev.yml run --rm app npm test
    ;;
  
  test:watch)
    echo "👀 Running tests in watch mode..."
    docker-compose -f docker-compose.dev.yml run --rm app npm run test:watch
    ;;
  
  test:coverage)
    echo "📊 Running tests with coverage..."
    docker-compose -f docker-compose.dev.yml run --rm app npm run test:coverage
    ;;
  
  lint)
    echo "🔍 Running linter..."
    docker-compose -f docker-compose.dev.yml run --rm app npm run lint
    ;;
  
  format)
    echo "✨ Formatting code..."
    docker-compose -f docker-compose.dev.yml run --rm app npm run format
    ;;
  
  build)
    echo "🔨 Building TypeScript..."
    docker-compose -f docker-compose.dev.yml run --rm app npm run build
    ;;
  
  seed)
    echo "🌱 Seeding database..."
    docker-compose -f docker-compose.dev.yml run --rm app npm run db:seed
    ;;
  
  migrate)
    echo "📊 Running migrations..."
    docker-compose -f docker-compose.dev.yml run --rm app npm run db:migrate
    ;;
  
  clean)
    echo "🧹 Cleaning up..."
    docker-compose -f docker-compose.dev.yml down -v
    rm -rf node_modules dist data/*.db
    ;;
  
  *)
    echo "Village Sim - Development Docker Helper"
    echo ""
    echo "Usage: ./docker-dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start         - Start development environment"
    echo "  stop          - Stop development environment"
    echo "  restart       - Restart app container"
    echo "  logs          - View app logs"
    echo "  shell         - Open shell in app container"
    echo "  install       - Install npm dependencies"
    echo "  test          - Run tests"
    echo "  test:watch    - Run tests in watch mode"
    echo "  test:coverage - Run tests with coverage"
    echo "  lint          - Run linter"
    echo "  format        - Format code"
    echo "  build         - Build TypeScript"
    echo "  seed          - Seed database"
    echo "  migrate       - Run migrations"
    echo "  clean         - Clean all data and containers"
    echo ""
    ;;
esac
