# Quick Start Guide

Get the bot running in under 2 minutes.

---

## 🚀 Start the Bot (Easiest Way)

```bash
cd /Users/salingga/Projects/first-agent/chatbot
./start_bot.sh
```

This script:
- ✅ Checks all prerequisites
- ✅ Activates virtual environment
- ✅ Detects corrupted session files
- ✅ Validates configuration
- ✅ Starts the bot

---

## 🚀 Start the Bot (Manual Way)

```bash
cd /Users/salingga/Projects/first-agent/chatbot
source .venv/bin/activate
python -m src.main
```

---

## ⚡ One-Time Setup

### 1. Disable Privacy Mode in @BotFather

**Do this ONCE** so the bot can see all messages:

1. Open Telegram
2. Message **@BotFather**
3. Send: `/mybots`
4. Select: **@reysablue_bot**
5. Tap: **Bot Settings**
6. Tap: **Group Privacy**
7. Tap: **Turn OFF**

✅ Confirmation: "Privacy mode is disabled for @reysablue_bot"

### 2. Verify Bot is in Group

```bash
python scripts/check_bot_permissions.py
```

Should show:
```
✅ Bot IS a member of this chat
```

If not, add @reysablue_bot to your Telegram group.

---

## 🧪 Test the Bot

**After starting the bot**, go to your Telegram group and send:

```
hello
```

**No @mention needed!** (if Privacy Mode is OFF)

**Expected**: Bot responds with a friendly message ✅

---

## 🔍 Debug Mode

To see what messages the bot receives:

```bash
python -m src.main
```

When someone sends a message, you'll see:
```
📨 Received message in chat -5556749038
   Text: hello
   From: 123456789
   ✅ Processing message...
   📤 Sending reply: ...
```

---

## 🛑 Stop the Bot

Press `Ctrl+C` in the terminal where the bot is running.

**Do NOT** force kill (kill -9) - let it shutdown gracefully.

---

## 🐛 Common Issues

### Issue: "too many values to unpack"

**Solution**:
```bash
rm -f session/reysa_bot.session*
python -m src.main
```

### Issue: Bot doesn't respond

**Check 1**: Is Privacy Mode OFF?
- Go to @BotFather → /mybots → @reysablue_bot → Bot Settings → Group Privacy
- Must be **OFF** to see all messages

**Check 2**: Is bot running?
- Terminal should show: "✅ Connected as bot: @reysa_blue_bot"

**Check 3**: Is bot in the group?
```bash
python scripts/check_bot_permissions.py
```

### Issue: "Can't reach Ollama"

**Solution**:
```bash
# Start Ollama in another terminal
ollama serve
```

---

## 📋 Pre-Flight Checklist

Before running the bot, verify:

- [ ] In chatbot directory: `pwd` shows `.../chatbot`
- [ ] Virtual env activated: `source .venv/bin/activate`
- [ ] Ollama running: `curl http://localhost:11434/api/tags`
- [ ] Bot in group: `python scripts/check_bot_permissions.py`
- [ ] Privacy Mode OFF in @BotFather
- [ ] .env file has BOT_TOKEN

---

## 🎯 Expected Output

When working correctly:

```
======================================================================
🤖 REYSA BOT (Bot Account Mode)
======================================================================
Bot: @reysablue_bot
Model: hermes3
Ollama URL: http://localhost:11434/api/chat
Max history: 20 messages
Allowed chats: -5556749038
======================================================================

🔍 Checking Ollama service...
✅ Ollama is reachable

🔐 Connecting to Telegram as bot...
✅ Connected as bot: @reysa_blue_bot
   Bot name: Reysa

💬 Listening for ALL messages in configured chats...
   ⚠️  Make sure Privacy Mode is OFF in @BotFather
   Bot will respond to every message in the chat
   Active chat: -5556749038
======================================================================
```

Now send a message in Telegram and watch the terminal for:
```
📨 Received message in chat -5556749038
```

---

## 🚀 Production Deployment

For production (Docker):

```bash
docker compose build
docker compose up -d
docker compose logs -f bot
```

---

## 📚 More Help

- **Troubleshooting**: `docs/TROUBLESHOOTING.md`
- **Privacy Mode**: `docs/PRIVACY-MODE-GUIDE.md`
- **Bot Setup**: `docs/BOT-SETUP-CHECKLIST.md`
- **Error Logs**: `logs/error.log`

---

## 🎉 Summary

**Start bot**:
```bash
./start_bot.sh
```

**Test in Telegram**:
```
hello
```

**Stop bot**:
```
Ctrl+C
```

That's it! 🎉

---

**Last Updated**: 2026-09-02  
**Bot**: @reysablue_bot  
**Mode**: Responds to ALL messages
