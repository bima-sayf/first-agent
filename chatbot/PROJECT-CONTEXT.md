# Chatbot Project Context

## Project Overview

This is a **Telegram userbot** that integrates with a locally-running **Hermes 3 (8B)** LLM model via Ollama. The bot monitors your **Telegram Saved Messages** chat and responds to your messages using AI, creating a personal AI assistant experience within Telegram.

## Architecture

The project uses a **3-container Docker Compose setup**:

### 1. `ollama` Container
- **Image**: `ollama/ollama:latest`
- **Purpose**: Model server that hosts and runs the Hermes 3 LLM
- **Port**: 11434 (exposed for API access)
- **Persistence**: Uses `ollama_data` Docker volume to store model weights (~4.7GB)
- **Health Check**: Validates Ollama is running with `ollama list` command

### 2. `model-init` Container
- **Image**: `ollama/ollama:latest`
- **Purpose**: One-time initialization container that pulls the Hermes 3 model
- **Lifecycle**: Runs once on first startup, exits after model download completes
- **Dependency**: Waits for `ollama` service to be healthy before executing

### 3. `bot` Container
- **Image**: Built from local Dockerfile (Python 3.11-slim)
- **Purpose**: Runs the Telethon-based Telegram userbot
- **Dependencies**: Waits for `model-init` to complete successfully
- **Persistence**: Mounts `./session/` directory to persist Telegram login session
- **Interactive**: Configured with `stdin_open` and `tty` for initial login flow

## Key Components

### Python Application (`main.py`)

**Framework**: Telethon (Telegram client library)

**Core Functionality**:
- Connects to Telegram as a userbot (using your own Telegram account)
- Monitors "Saved Messages" chat for new messages
- Sends user messages to Ollama's Hermes 3 model
- Posts AI responses back to Saved Messages with 🤖 prefix
- Maintains conversation history (last 20 messages) in memory

**Important Features**:
1. **Self-reply prevention**: Bot ignores messages starting with 🤖 to avoid infinite loops
2. **Typing indicator**: Shows "typing..." while waiting for AI response
3. **Error handling**: Gracefully handles Ollama connection failures
4. **Session persistence**: Stores Telegram auth in `session/hermes_userbot.session`

**Configuration**:
- `TG_API_ID` and `TG_API_HASH`: Required Telegram API credentials
- `OLLAMA_URL`: Ollama API endpoint (default: `http://ollama:11434/api/chat`)
- `OLLAMA_MODEL`: Model name (default: `hermes3`)
- `MAX_HISTORY_MESSAGES`: Conversation context window (default: 20 messages)

### Dependencies (`requirements.txt`)

```
telethon>=1.36    # Telegram client library
python-dotenv>=1.0  # Environment variable management
httpx>=0.27       # Async HTTP client for Ollama API
```

## Data Flow

```
User sends message in Telegram Saved Messages
         ↓
Telethon bot receives event (main.py)
         ↓
Message added to conversation history
         ↓
HTTP POST to Ollama API (http://ollama:11434/api/chat)
         ↓
Hermes 3 model generates response
         ↓
Response added to history
         ↓
Bot posts reply with 🤖 prefix in Saved Messages
```

## Authentication & Security

### First Run (Interactive Login)
- Run `docker compose up` (without `-d` flag)
- Telethon prompts for phone number in terminal
- Enter Telegram login code received on your phone
- Session file created: `./session/hermes_userbot.session`
- Subsequent runs use persisted session (no re-login needed)

### Credentials Required
- **Telegram API credentials**: Obtain from https://my.telegram.org → API development tools
- Both `TG_API_ID` (integer) and `TG_API_HASH` (string) must be set in `.env`

## Deployment & Operations

### Initial Setup
```bash
cd chatbot/
cp .env.example .env
# Edit .env with your Telegram credentials
docker compose up  # Interactive first run
```

### Normal Usage
```bash
docker compose up -d          # Start in background
docker compose logs -f bot    # Watch bot logs
docker compose down           # Stop all services
```

### Data Persistence
- **Ollama model weights**: Docker volume `ollama_data` (survives restarts)
- **Telegram session**: Host directory `./session/` (survives restarts)
- **Conversation history**: In-memory only (resets on bot container restart)

## Platform Considerations

### macOS/Apple Silicon Notes
- Ollama runs in Docker container using **CPU only** (no GPU passthrough on macOS)
- Performance slower than native Ollama installation
- Hermes 3 8B still usable on M-series chips despite CPU limitation
- Alternative: Run Ollama natively on Mac for GPU acceleration

### Model Size
- Hermes 3 model: ~4.7GB download
- First run requires network download time
- Stored persistently in Docker volume

## Customization Options

### Changing Models
1. Edit `OLLAMA_MODEL` in `.env`
2. Update `entrypoint` in `docker-compose.yml` → `model-init` service
3. Run `docker compose up` to pull new model

### Adjusting Behavior
- **System prompt**: Modify `SYSTEM_PROMPT` in `main.py`
- **History length**: Change `MAX_HISTORY_MESSAGES`
- **Bot prefix**: Update `BOT_PREFIX` to change emoji/marker
- **Timeouts**: Adjust `httpx.AsyncClient(timeout=...)` value

## Troubleshooting

### Common Issues

**"Can't reach Ollama"**
- Root cause: `ollama` container not running
- Check: `docker compose ps`
- Fix: `docker compose up -d`

**`model-init` Fails**
- Root cause: Network issue during 4.7GB model download
- Check: `docker compose logs model-init`
- Fix: Re-run `docker compose up` to retry

**Login Code Never Arrives**
- Root cause: Running in detached mode blocks terminal prompts
- Fix: Run `docker compose up` (without `-d`) for interactive login

**Bot Replies to Itself (Loop)**
- Should not happen due to `BOT_PREFIX` check
- Verify bot messages start with 🤖 character

## Development Notes

### Code Structure
- **Async/await pattern**: Uses `asyncio` for concurrent I/O
- **Event-driven**: Telethon's `@client.on(events.NewMessage)` decorator
- **Type hints**: Minimal typing, could be enhanced
- **Error handling**: Basic try/except, could be more specific

### Potential Enhancements
- Add conversation reset command
- Support multiple chat contexts
- Implement streaming responses (Ollama supports SSE)
- Add rate limiting or usage tracking
- Store conversation history persistently (database/file)
- Support multiple models with selection command
- Add conversation export functionality

## File Structure

```
chatbot/
├── PROJECT-CONTEXT.md         # This file - main knowledge hub
├── README.md                  # Quick start guide
├── docs/                      # Additional documentation
│   ├── BACKLOGS.md            # Feature roadmap
│   ├── CHANGELOG.md           # Version history
│   ├── CRITICAL-FIX-SUMMARY.md  # Bug fix details
│   ├── GROUP-SETUP-GUIDE.md   # Group chat setup
│   ├── STRUCTURE.md           # Project organization
│   ├── REORGANIZATION-SUMMARY.md  # Migration guide
│   ├── ORGANIZATION-COMPLETE.md   # Organization summary
│   ├── UX-004-ASSESSMENT.md   # Technical assessment
│   └── UX-004-IMPLEMENTATION-COMPLETE.md  # Implementation
├── src/                       # Source code
│   ├── __init__.py            # Package initialization
│   └── main.py                # Bot application
├── scripts/                   # Utility scripts
│   ├── entrypoint.sh          # Docker entrypoint with security
│   └── get_chat_id.py         # Find Telegram chat IDs
├── tests/                     # Test suite
│   ├── __init__.py
│   └── test_eventloop.py      # Event loop verification
├── session/                   # Telegram auth (git-ignored)
│   └── hermes_userbot.session # Created on first run
├── logs/                      # Runtime logs (git-ignored)
│   └── .gitkeep
├── .dockerignore              # Docker build exclusions
├── .env                       # Environment variables (git-ignored)
├── .env.example               # Config template
├── .gitignore                 # Git exclusions
├── Dockerfile                 # Container definition
├── docker-compose.yml         # Multi-container orchestration
├── requirements.txt           # Python dependencies
└── README.md                  # Quick start guide
```

## External Dependencies

- **Telegram API**: Requires active Telegram account and API credentials
- **Ollama**: LLM inference engine (runs in container)
- **Hermes 3 Model**: 8B parameter model from Nous Research
- **Docker**: Container runtime required on host machine

## Use Cases

- Personal AI assistant within Telegram
- Quick AI consultations without leaving Telegram app
- Private AI conversations (everything runs locally)
- Testing/prototyping conversational AI
- Learning Telegram userbot development

## Limitations

- Only monitors Saved Messages (not other chats)
- CPU-only inference on macOS (slower responses)
- Conversation history resets on restart
- Requires Docker and ~5GB disk space
- Userbot may violate Telegram ToS (use at own risk)
