#!/bin/bash
set -e

# Create session directory if it doesn't exist
mkdir -p /app/session

# Set restrictive permissions on session directory
# Only owner can read/write/execute
chmod 700 /app/session

# If session files exist, set restrictive permissions
if [ -f /app/session/hermes_userbot.session ]; then
    echo "Setting secure permissions on existing session file..."
    chmod 600 /app/session/hermes_userbot.session
fi

# Also set permissions on journal file if it exists
if [ -f /app/session/hermes_userbot.session-journal ]; then
    chmod 600 /app/session/hermes_userbot.session-journal
fi

echo "Session directory permissions secured (700)"
echo "Starting bot..."

# Execute the main Python application from src directory
exec python -m src.main
