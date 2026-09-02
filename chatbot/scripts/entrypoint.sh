#!/bin/bash
set -e

# Create session directory if it doesn't exist
mkdir -p /app/session

# Set restrictive permissions on session directory
chmod 700 /app/session

# Set secure permissions on session files if they exist
for session_file in /app/session/*.session*; do
    if [ -f "$session_file" ]; then
        echo "Setting secure permissions on $session_file"
        chmod 600 "$session_file"
    fi
done

echo "Session directory permissions secured (700)"
echo "Starting bot..."

# Execute the main Python application
exec python -m src.main
