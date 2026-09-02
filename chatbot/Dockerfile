FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Copy scripts
COPY scripts/ ./scripts/

# Make entrypoint script executable
RUN chmod +x scripts/entrypoint.sh

# Use entrypoint script to set permissions and start bot
ENTRYPOINT ["./scripts/entrypoint.sh"]
