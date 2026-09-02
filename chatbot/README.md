# Hermes Telegram Bot

AI-powered Telegram userbot that integrates with locally-running Hermes 3 (8B) model via Ollama. Chat with AI directly in your Telegram Saved Messages.

## Quick Start

```bash
# 1. Configure
cp .env.example .env
# Edit .env with your Telegram API credentials

# 2. First run (interactive login)
docker compose up

# 3. Normal use
docker compose up -d          # Start in background
docker compose logs -f bot    # Watch bot logs
docker compose down           # Stop everything
```

Get Telegram API credentials from: https://my.telegram.org → API development tools

## Project Structure

```
chatbot/
├── PROJECT-CONTEXT.md         # 📘 Main knowledge hub - architecture & design
├── README.md                  # 📄 This file - quick start guide
├── docs/                      # 📚 Additional documentation
│   ├── BACKLOGS.md            # Feature roadmap & tasks
│   ├── CHANGELOG.md           # Version history
│   ├── CRITICAL-FIX-SUMMARY.md  # Event loop fix details
│   ├── GROUP-SETUP-GUIDE.md   # How to use in Telegram groups
│   ├── STRUCTURE.md           # Project organization guide
│   ├── REORGANIZATION-SUMMARY.md  # Migration details
│   ├── ORGANIZATION-COMPLETE.md   # Organization summary
│   ├── UX-004-ASSESSMENT.md   # Group chat technical assessment
│   └── UX-004-IMPLEMENTATION-COMPLETE.md  # Implementation summary
├── src/                       # Source code
│   ├── __init__.py
│   └── main.py                # Bot application
├── scripts/                   # Utility scripts
│   ├── entrypoint.sh          # Docker entrypoint
│   └── get_chat_id.py         # Find Telegram chat IDs
├── tests/                     # Test suite
│   ├── __init__.py
│   └── test_eventloop.py
├── session/                   # Telegram auth (git-ignored)
├── logs/                      # Runtime logs (git-ignored)
├── .env                       # Environment config (git-ignored)
├── .env.example               # Config template
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Container definition
└── docker-compose.yml         # Multi-container setup
```

## Documentation

- **[PROJECT-CONTEXT.md](PROJECT-CONTEXT.md)** - Main knowledge hub: architecture, design, and technical details
- **[Backlog](docs/BACKLOGS.md)** - Feature roadmap and improvement tracking
- **[Changelog](docs/CHANGELOG.md)** - Version history and updates
- **[Group Setup Guide](docs/GROUP-SETUP-GUIDE.md)** - How to use in Telegram groups
- **[Structure Guide](docs/STRUCTURE.md)** - Project organization explained

## Features

- 🤖 AI assistant in Telegram Saved Messages
- 🔒 Runs completely locally (privacy-first)
- 🐳 Fully containerized with Docker
- 💬 Maintains 20-message conversation history
- 🔐 Secure session handling with proper permissions
- ✅ Environment validation with helpful error messages
- 🛡️ Self-reply prevention to avoid loops

## Requirements

- Docker and Docker Compose
- Telegram API credentials (API ID and Hash)
- ~5GB disk space for model
- macOS, Linux, or Windows with WSL2

## Security Notes

⚠️ **Important**: This bot runs as a userbot (using your personal Telegram account). Session files contain authentication tokens - never share or commit them. Review [Telegram's ToS](https://telegram.org/tos) for userbot compliance.

## Development

```bash
# Run tests
cd tests && python test_eventloop.py

# Run locally (without Docker)
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m src.main
```

## Troubleshooting

See the [full documentation](docs/README.md#troubleshooting) for common issues and solutions.

## License

See project root for license information.

## Contributing

See [Backlog](docs/BACKLOGS.md) for planned features and improvements.
