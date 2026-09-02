# Reysa Telegram Bot - Project Context

## Project Overview

**Reysa** is a Telegram bot that integrates with a locally-running **Hermes 3 (8B)** LLM model via Ollama. The bot operates in Telegram groups, responds to messages, and maintains per-chat conversation history.

**Bot**: @reysablue_bot (Reysa)  
**Model**: Hermes 3 (8B) via Ollama  
**Mode**: Bot account (appears as separate bot, not personal account)  
**Deployment**: Dockerized 3-container setup

---

## Architecture

### Container Stack

The project uses a **3-container Docker Compose setup**:

#### 1. `ollama` Container
- **Image**: `ollama/ollama:latest`
- **Purpose**: Model server hosting Hermes 3 LLM
- **Port**: 11434 (exposed for API access)
- **Persistence**: `ollama_data` Docker volume (~4.7GB)
- **Health Check**: `ollama list` command validation

#### 2. `model-init` Container
- **Image**: `ollama/ollama:latest`
- **Purpose**: One-time model download
- **Lifecycle**: Runs once, exits after completion
- **Dependency**: Waits for `ollama` health check

#### 3. `bot` Container  
- **Image**: Built from local Dockerfile (Python 3.11-slim)
- **Purpose**: Runs Telethon-based Telegram bot
- **Dependencies**: Waits for `model-init` completion
- **Persistence**: Mounts `./session/` for auth
- **Interactive**: Configured for terminal I/O

---

## Core Application (`src/main.py`)

### Framework
**Telethon** - Python Telegram client library

### Key Features

1. **Bot Account Mode**
   - Authenticates with bot token (from @BotFather)
   - Appears as @reysablue_bot (not personal account)
   - Works in group chats

2. **Message Handling**
   - Listens to configured chats (via `ALLOWED_CHATS`)
   - Responds to all messages (Privacy Mode OFF)
   - Ignores own messages (prevents loops)
   - Shows typing indicator during processing

3. **Conversation Management**
   - Per-chat conversation history (in-memory)
   - Maintains last 20 messages for context
   - Separate history per chat ID

4. **AI Integration**
   - Sends messages to Ollama via HTTP API
   - Uses Hermes 3 model for responses
   - Handles errors gracefully (connection failures, timeouts)

### Configuration

| Variable | Purpose | Default |
|----------|---------|---------|
| `BOT_TOKEN` | Bot authentication | - (required) |
| `TG_API_ID` | Telegram API ID | - (required) |
| `TG_API_HASH` | Telegram API hash | - (required) |
| `ALLOWED_CHATS` | Comma-separated chat IDs | `-5556749038` |
| `OLLAMA_URL` | Ollama API endpoint | `http://ollama:11434/api/chat` |
| `OLLAMA_MODEL` | Model name | `hermes3` |

---

## Data Flow

```
User sends message in Telegram group
         ↓
Bot receives event (src/main.py)
         ↓
Checks: Not own message? → Yes, process
         ↓
Removes bot mentions from text (cleanup)
         ↓
Retrieves chat-specific conversation history
         ↓
HTTP POST to Ollama (http://ollama:11434/api/chat)
  - Includes system prompt
  - Includes last 20 messages
  - Request timeout: 120s
         ↓
Hermes 3 generates response
         ↓
Appends to conversation history
         ↓
Bot sends reply in Telegram
```

---

## Authentication

### Bot Setup (One-time)
1. Message @BotFather on Telegram
2. Create bot with `/newbot`
3. Get bot token
4. **Disable Privacy Mode** (important!)
   - @BotFather → /mybots → Your Bot → Bot Settings → Group Privacy → Turn OFF
5. Add token to `.env`
6. Add bot to Telegram group

### First Run
```bash
docker compose up  # Creates session file automatically
```

Session file: `./session/reysa_bot.session`  
Persists across restarts (no re-auth needed)

---

## Dependencies

### Python Packages (`requirements.txt`)
```
telethon>=1.36      # Telegram client library
python-dotenv>=1.0  # Environment variable management
httpx>=0.27         # Async HTTP client for Ollama API
```

### External Services
- **Telegram Bot API** - Bot authentication and messaging
- **Ollama** - Local LLM inference engine
- **Hermes 3 Model** - 8B parameter LLM from Nous Research

---

## Deployment

### Local Development
```bash
# Setup
cp .env.example .env
# Edit .env with credentials

# Run locally
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m src.main
```

### Docker Production
```bash
# Start
docker compose up -d

# Monitor
docker compose logs -f bot

# Stop
docker compose down
```

### Helper Script
```bash
./start_bot.sh  # Validates config and starts bot
```

---

## Data Persistence

| Data | Storage | Survives Restart? |
|------|---------|-------------------|
| Model weights | Docker volume `ollama_data` | ✅ Yes |
| Session auth | Host directory `./session/` | ✅ Yes |
| Conversation history | In-memory dict | ❌ No |

**Note**: Conversation history resets on bot restart. For persistence, see BACKLOGS.md → PERS-001.

---

## Platform Considerations

### macOS/Apple Silicon
- Ollama runs in container using **CPU only**
- No GPU passthrough on macOS Docker
- Performance adequate but slower than native
- Alternative: Run Ollama natively for GPU acceleration

### Model Size
- Hermes 3: ~4.7GB download
- First run requires network download
- Stored in Docker volume persistently

---

## Privacy Mode

**Important Configuration**: Privacy Mode controls what messages bots can see.

### Privacy Mode ON (Default)
- Bot only sees:
  - Messages mentioning it (@reysablue_bot)
  - Replies to its messages
  - Commands (/start, /help)
- ❌ Cannot see regular group messages

### Privacy Mode OFF (Current Setup)
- Bot sees **all messages** in group
- Responds to every message
- More conversational
- Configure via @BotFather

See [docs/PRIVACY-MODE-GUIDE.md](docs/PRIVACY-MODE-GUIDE.md) for details.

---

## Security

### Session Files
- Contains bot authentication tokens
- File permissions: `600` (owner read/write only)
- Directory permissions: `700`
- Git-ignored (never committed)
- Set automatically by `scripts/entrypoint.sh`

### Environment Variables
- `.env` file git-ignored
- Sensitive data never in code
- Validation on startup with clear errors

### Bot Permissions
- Bot runs with minimal Telegram permissions
- Can send/receive messages in allowed chats
- Cannot access chats not in `ALLOWED_CHATS`

---

## File Structure

```
chatbot/
├── PROJECT-CONTEXT.md         # This file
├── README.md                  # Quick start guide
├── docs/                      # Documentation
│   ├── INDEX.md               # Documentation index
│   ├── BACKLOGS.md            # Feature roadmap
│   ├── QUICK-START.md         # Detailed setup
│   ├── TROUBLESHOOTING.md     # Common issues
│   └── PRIVACY-MODE-GUIDE.md  # Privacy configuration
├── src/                       # Source code
│   ├── __init__.py
│   └── main.py                # Bot application
├── scripts/                   # Utility scripts
│   ├── entrypoint.sh          # Docker entrypoint
│   ├── get_chat_id.py         # Find chat IDs
│   └── check_bot_permissions.py  # Verify access
├── session/                   # Telegram auth (git-ignored)
│   └── reysa_bot.session      # Created on first run
├── logs/                      # Runtime logs (git-ignored)
├── .dockerignore              # Docker build exclusions
├── .env                       # Config (git-ignored)
├── .env.example               # Config template
├── .gitignore                 # Git exclusions
├── Dockerfile                 # Container definition
├── docker-compose.yml         # Container orchestration
├── requirements.txt           # Python dependencies
└── start_bot.sh               # Startup helper script
```

---

## Customization

### Change Models
1. Edit `OLLAMA_MODEL` in `.env`
2. Update `docker-compose.yml` → `model-init` → `entrypoint`
3. Run `docker compose up` to pull new model

### Adjust Bot Behavior
- **System prompt**: Modify `SYSTEM_PROMPT` in `main.py`
- **History length**: Change `MAX_HISTORY_MESSAGES` (default: 20)
- **Timeout**: Adjust `httpx.AsyncClient(timeout=...)` (default: 120s)

### Add Commands
See BACKLOGS.md → UX-001 for planned command system.

---

## Development Notes

### Code Style
- **Async/await** pattern throughout
- **Event-driven** via Telethon decorators
- **Type hints** minimal (improvement opportunity)
- **Error handling** basic try/except (could be more specific)

### Testing
- No automated tests currently (see BACKLOGS.md → TEST-001)
- Manual testing with local Telegram groups
- Helper scripts for verification

---

## Known Limitations

1. **No persistent history** - Resets on restart
2. **CPU-only on macOS** - Slower inference
3. **In-memory storage** - Not suitable for high traffic
4. **Single bot instance** - No load balancing
5. **No rate limiting** - Can be overwhelmed
6. **No metrics** - No usage tracking

See [docs/BACKLOGS.md](docs/BACKLOGS.md) for planned improvements.

---

## Use Cases

- AI assistant in Telegram groups
- Private AI conversations (runs locally)
- Team chat bot with custom knowledge
- Quick AI consultations without leaving Telegram
- Testing/prototyping conversational AI

---

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for detailed solutions.

**Quick fixes**:
- Bot doesn't respond → Check Privacy Mode is OFF
- "Can't reach Ollama" → `docker compose ps` and restart services
- Session errors → Delete `session/reysa_bot.session*` and restart

---

## Next Steps

See [docs/BACKLOGS.md](docs/BACKLOGS.md) for:
- Planned features
- Improvement roadmap
- Known issues
- Contribution opportunities

---

**Version**: 1.0  
**Last Updated**: 2026-09-02  
**Bot**: @reysablue_bot (Reysa)  
**Status**: Production Ready
