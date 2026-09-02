#!/bin/bash
# Startup script for Reysa Bot
# This script ensures the bot starts correctly

set -e

echo "========================================================================"
echo "🚀 STARTING REYSA BOT"
echo "========================================================================"

# Check if we're in the right directory
if [ ! -f "src/main.py" ]; then
    echo "❌ Error: Must run from chatbot/ directory"
    echo "   cd /Users/salingga/Projects/first-agent/chatbot"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "   Copy .env.example to .env and configure it"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Error: Virtual environment not found"
    echo "   Create it with: python3 -m venv .venv"
    exit 1
fi

# Activate virtual environment
echo "✅ Activating virtual environment..."
source .venv/bin/activate

# Check if BOT_TOKEN is set
if ! grep -q "BOT_TOKEN=" .env; then
    echo "❌ Error: BOT_TOKEN not found in .env"
    exit 1
fi

# Check if Ollama is running
echo "✅ Checking Ollama..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "   Ollama is running ✅"
else
    echo "   ⚠️  Ollama not reachable (bot will still start)"
fi

# Check for corrupted session files
SESSION_FILE="session/reysa_bot.session"
if [ -f "$SESSION_FILE" ]; then
    FILE_SIZE=$(stat -f%z "$SESSION_FILE" 2>/dev/null || stat -c%s "$SESSION_FILE" 2>/dev/null)
    if [ "$FILE_SIZE" -lt 1000 ]; then
        echo "⚠️  Session file seems corrupted (too small), deleting..."
        rm -f session/reysa_bot.session*
    fi
fi

echo ""
echo "========================================================================"
echo "Starting bot..."
echo "========================================================================"
echo ""

# Run the bot
python -m src.main

echo ""
echo "========================================================================"
echo "👋 Bot stopped"
echo "========================================================================"
