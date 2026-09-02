# Troubleshooting Guide

Common issues and solutions for the Reysa Telegram Bot.

---

## 🔴 "too many values to unpack (expected 5)" Error

**Error Message**:
```
ValueError: too many values to unpack (expected 5)
  File "telethon/sessions/sqlite.py", line 64, in __init__
```

**Cause**: Corrupted or incompatible session files from previous bot runs.

**Solution**:
```bash
cd /Users/salingga/Projects/first-agent/chatbot
rm -f session/reysa_bot.session*
rm -f session/test_bot.session*
python -m src.main
```

The bot will create fresh session files automatically.

---

## 🔴 Bot Hangs on Startup

**Symptoms**: Bot starts but never shows "Connected to Telegram" message.

**Possible Causes**:
1. Corrupted session file
2. Network connectivity issues
3. Invalid bot token

**Solutions**:

### 1. Delete session files and restart:
```bash
rm -f session/reysa_bot.session*
python -m src.main
```

### 2. Check network connectivity:
```bash
ping telegram.org
```

### 3. Verify bot token:
```bash
# Check .env file
cat .env | grep BOT_TOKEN

# Token format should be: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

---

## 🟡 "Can't reach Ollama" Warning

**Message**:
```
⚠️  Warning: Cannot reach Ollama at http://localhost:11434/api/chat
```

**Cause**: Ollama service is not running.

**Solution**:
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start it
ollama serve
```

**Note**: Bot will still start and wait for Ollama to become available.

---

## 🟡 Bot Doesn't Respond in Group

**Symptoms**: Bot is online but doesn't reply to messages.

**Checklist**:

### 1. Did you mention the bot?
```
✅ @reysablue_bot hello
❌ just hello
```

Bot account mode requires explicit mentions or replies.

### 2. Is the bot in the group?
- Check group member list
- Bot should show as @reysablue_bot

### 3. Is the group ID correct?
```bash
# Check .env
cat .env | grep ALLOWED_CHATS

# Should be: ALLOWED_CHATS=-5556749038
```

### 4. Check bot logs:
```bash
# If running in terminal
python -m src.main

# If running in Docker
docker compose logs -f bot
```

---

## 🟡 "Configuration Error" on Startup

**Message**:
```
🚨 CONFIGURATION ERROR
❌ BOT_TOKEN is not set
```

**Solution**:

### 1. Check if .env file exists:
```bash
ls -la .env
```

### 2. If missing, copy from example:
```bash
cp .env.example .env
```

### 3. Edit .env and add your bot token:
```bash
BOT_TOKEN=8843794560:AAHVAfK5VlEHTOXPILib1_UVLpG3NUbKWXE
TG_API_ID=35779918
TG_API_HASH=2c38d75493f8d3f9a1c966990e0266ff
ALLOWED_CHATS=-5556749038
```

### 4. Restart the bot:
```bash
python -m src.main
```

---

## 🟢 Bot Responds But Answers Are Wrong

**Symptoms**: Bot works but gives incorrect/generic responses.

**Possible Causes**:
1. Wrong Ollama model loaded
2. System prompt not configured
3. Conversation history issue

**Solutions**:

### 1. Check loaded model:
```bash
ollama list
# Should show: hermes3
```

### 2. Load correct model:
```bash
ollama pull hermes3
```

### 3. Check system prompt in main.py:
```python
SYSTEM_PROMPT = (
    "You are Reysa, a helpful and concise AI assistant..."
)
```

### 4. Reset conversation history:
Restart the bot to clear in-memory history.

---

## 🟢 Session File Permission Errors

**Error**:
```
PermissionError: [Errno 13] Permission denied: 'session/reysa_bot.session'
```

**Solution**:
```bash
# Fix permissions
chmod 600 session/reysa_bot.session
chmod 700 session/

# Or delete and recreate
rm -f session/reysa_bot.session*
python -m src.main
```

---

## 🔵 Switching Between Userbot and Bot Account

**Scenario**: You want to switch modes.

**From Userbot to Bot Account**:
```bash
# 1. Update .env
BOT_TOKEN=your_bot_token_here

# 2. Delete old userbot session (optional)
rm -f session/hermes_userbot.session*

# 3. Restart bot (will create new bot session)
python -m src.main
```

**From Bot Account to Userbot**:
```bash
# 1. Remove BOT_TOKEN from .env
# (or comment it out)

# 2. Delete bot session
rm -f session/reysa_bot.session*

# 3. Update main.py back to userbot mode
# (restore original authentication code)
```

---

## 🔵 Docker-Specific Issues

### Container Won't Start

```bash
# Check container logs
docker compose logs bot

# Check if port is in use
lsof -i :11434

# Rebuild container
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Ollama Not Reachable in Docker

**Error**:
```
Can't reach Ollama — is the `ollama` container running?
```

**Solution**:
```bash
# Check if ollama container is running
docker compose ps

# Start ollama
docker compose up -d ollama

# Check ollama logs
docker compose logs ollama
```

---

## 🔵 Development vs Production Differences

### Local Development (macOS)
```bash
# Uses host Ollama
OLLAMA_URL=http://localhost:11434/api/chat

# Run directly
python -m src.main
```

### Docker Production
```bash
# Uses Docker network
OLLAMA_URL=http://ollama:11434/api/chat

# Run in container
docker compose up -d
```

---

## 📋 Quick Diagnostic Commands

Run these to check system health:

```bash
# 1. Check environment variables
cat .env

# 2. Check session files
ls -lh session/

# 3. Check Ollama
curl http://localhost:11434/api/tags

# 4. Check bot process
ps aux | grep "python.*main.py"

# 5. Test bot locally
source .venv/bin/activate
python -m src.main

# 6. Check Docker (if using)
docker compose ps
docker compose logs bot
```

---

## 🆘 Still Having Issues?

### Collect Diagnostic Info:

```bash
# Save diagnostic info to file
echo "=== Environment ===" > debug.txt
cat .env >> debug.txt
echo -e "\n=== Session Files ===" >> debug.txt
ls -lh session/ >> debug.txt
echo -e "\n=== Ollama Status ===" >> debug.txt
curl http://localhost:11434/api/tags 2>&1 >> debug.txt
echo -e "\n=== Bot Test ===" >> debug.txt
python -m src.main 2>&1 | head -50 >> debug.txt

# Share debug.txt for help
```

### Common Solutions That Fix Most Issues:

1. **Delete session files**: `rm -f session/reysa_bot.session*`
2. **Restart Ollama**: `ollama serve`
3. **Check .env**: Make sure BOT_TOKEN is set
4. **Virtual environment**: `source .venv/bin/activate`

---

## 📚 Related Documentation

- **Setup**: `README.md`
- **Implementation**: `docs/UX-005-IMPLEMENTATION.md`
- **Backlog**: `docs/BACKLOGS.md`
- **Project Context**: `PROJECT-CONTEXT.md`

---

**Last Updated**: 2026-09-02  
**Bot Version**: 1.0.0 (Bot Account Mode)
