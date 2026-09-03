# Reysa Telegram Bot

AI-powered Telegram bot that integrates with locally-running Hermes 3 (8B) model via Ollama. Chat with AI in your Telegram groups.

**Bot**: @reysablue_bot (Reysa)  
**Model**: Hermes 3 (8B)  
**Mode**: Group chat support with per-chat conversation history

---

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your credentials:
#   - BOT_TOKEN (from @BotFather)
#   - TG_API_ID and TG_API_HASH (from my.telegram.org)
#   - ALLOWED_CHATS (your group chat ID)

# 2. Start the bot
docker compose up -d

# 3. Monitor logs
docker compose logs -f bot

# 4. Stop the bot
docker compose down
```

**Or use the startup script**:
```bash
./start_bot.sh
```

---

## Setup

### 1. Get Bot Token
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token
4. **Disable Privacy Mode**: /mybots → Your Bot → Bot Settings → Group Privacy → Turn OFF

### 2. Get API Credentials
1. Visit [my.telegram.org](https://my.telegram.org)
2. Go to "API development tools"
3. Create an application
4. Copy API ID and API Hash

### 3. Get Chat ID
```bash
python scripts/get_chat_id.py
```

### 4. Configure `.env`
```bash
BOT_TOKEN=your_bot_token_here
TG_API_ID=your_api_id
TG_API_HASH=your_api_hash
ALLOWED_CHATS=-1234567890
OLLAMA_MODEL=hermes3
```

### 5. Add Bot to Group
1. Add @reysablue_bot to your Telegram group
2. Send a test message
3. Bot will respond!

---

## Features

- 🤖 **Bot Account Mode** - Appears as @reysablue_bot (not your personal account)
- 🔒 **Privacy-First** - Runs completely locally
- 💬 **Group Chat Support** - Works in Telegram groups
- 📝 **Per-Chat History** - Maintains separate conversation context per chat
- 🐳 **Fully Containerized** - Docker-based deployment
- 🔐 **Secure Sessions** - Proper file permissions and git exclusions
- ✅ **Environment Validation** - Clear error messages for configuration issues
- 🎯 **Responds to All Messages** - No @mention required (when Privacy Mode is OFF)

---

## Project Structure

```
chatbot/
├── README.md                  # This file
├── PROJECT-CONTEXT.md         # Architecture & technical details
├── docs/                      # Documentation
│   ├── BACKLOGS.md            # Feature roadmap
│   ├── INDEX.md               # Documentation index
│   ├── QUICK-START.md         # Detailed setup guide
│   ├── TROUBLESHOOTING.md     # Common issues & solutions
│   └── PRIVACY-MODE-GUIDE.md  # Privacy mode configuration
├── src/                       # Source code
│   ├── __init__.py
│   └── main.py                # Bot application
├── scripts/                   # Utility scripts
│   ├── entrypoint.sh          # Docker entrypoint
│   ├── get_chat_id.py         # Find chat IDs
│   └── check_bot_permissions.py  # Verify bot access
├── session/                   # Telegram sessions (git-ignored)
├── logs/                      # Runtime logs (git-ignored)
├── .env                       # Configuration (git-ignored)
├── .env.example               # Configuration template
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Container definition
├── docker-compose.yml         # Multi-container orchestration
└── start_bot.sh               # Startup helper script
```

---

## Documentation

- **[QUICK-START.md](docs/QUICK-START.md)** - Detailed setup guide
- **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues & solutions
- **[PRIVACY-MODE-GUIDE.md](docs/PRIVACY-MODE-GUIDE.md)** - Configure response modes
- **[PROJECT-CONTEXT.md](PROJECT-CONTEXT.md)** - Architecture & design decisions
- **[BACKLOGS.md](docs/BACKLOGS.md)** - Open work (shipped items are in `docs/changelogs/`)
- **[DOCUMENTATION-STANDARDS.md](docs/DOCUMENTATION-STANDARDS.md)** - Where a new document belongs
- **[changelogs/](docs/changelogs/)** - History and shipped features
- **[INDEX.md](docs/INDEX.md)** - Full documentation index

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BOT_TOKEN` | Yes | - | Bot token from @BotFather |
| `TG_API_ID` | Yes | - | API ID from my.telegram.org |
| `TG_API_HASH` | Yes | - | API Hash from my.telegram.org |
| `ALLOWED_CHATS` | Yes | `-5556749038` | Comma-separated chat IDs |
| `OLLAMA_MODEL` | No | `hermes3` | Ollama model to use |
| `OLLAMA_URL` | No | `http://localhost:11434/api/chat` | Ollama API endpoint |

### Privacy Mode

**For bot to see all messages** (not just mentions):
1. Message @BotFather
2. Go to /mybots → @reysablue_bot → Bot Settings → Group Privacy
3. **Turn OFF** privacy mode

See [PRIVACY-MODE-GUIDE.md](docs/PRIVACY-MODE-GUIDE.md) for details.

---

## Development

### Local Development
```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run bot
python -m src.main
```

### Docker Development
```bash
# Build and run
docker compose up

# Rebuild after code changes
docker compose build
docker compose up -d

# View logs
docker compose logs -f bot

# Stop containers
docker compose down
```

---

## Requirements

- **Docker & Docker Compose** (for containerized deployment)
- **Python 3.11+** (for local development)
- **Telegram Bot Token** (from @BotFather)
- **Telegram API Credentials** (from my.telegram.org)
- **~5GB disk space** (for Ollama model)
- **macOS, Linux, or Windows with WSL2**

---

## Troubleshooting

### Bot doesn't respond
- Check Privacy Mode is OFF in @BotFather
- Verify bot is added to the group
- Check ALLOWED_CHATS in .env matches your group ID
- View logs: `docker compose logs -f bot`

### "Can't reach Ollama"
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve
```

### Session file errors
```bash
# Delete and recreate session
rm -f session/reysa_bot.session*
python -m src.main
```

See [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for more solutions.

---

## Security

- ✅ Session files are git-ignored and have restrictive permissions (600)
- ✅ `.env` file is git-ignored
- ✅ Sensitive data never committed to repository
- ✅ Bot runs with minimal permissions
- ⚠️ Review [Telegram Bot API Terms](https://core.telegram.org/bots/faq)

---

## Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start bot in background |
| `docker compose logs -f bot` | View bot logs |
| `docker compose down` | Stop bot |
| `docker compose restart bot` | Restart bot |
| `./start_bot.sh` | Start with validation checks |
| `python scripts/check_bot_permissions.py` | Verify bot permissions |
| `python scripts/get_chat_id.py` | Find chat IDs |

---

## Support

- **Documentation**: See [docs/](docs/)
- **Issues**: Check [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- **Backlog**: See planned features in [BACKLOGS.md](docs/BACKLOGS.md)

---

## License

See project root for license information.

---

**Version**: 1.0  
**Last Updated**: 2026-09-02  
**Bot**: @reysablue_bot (Reysa)
