# Bot Setup Checklist

## ⚠️ IMPORTANT: Privacy Mode Settings

By default, Telegram bots in groups have **Privacy Mode ENABLED**, which means:
- ✅ Bot can see messages that mention it (@botname)
- ✅ Bot can see replies to its messages
- ✅ Bot can see commands (/command)
- ❌ Bot CANNOT see regular group messages

### How to Check Privacy Mode

1. Open Telegram and search for **@BotFather**
2. Send `/mybots`
3. Select **@reysablue_bot**
4. Tap **Bot Settings**
5. Tap **Group Privacy**
6. Check current setting:
   - **ENABLED** = Bot only sees mentions/replies (CURRENT)
   - **DISABLED** = Bot sees all messages (required for some features)

### Privacy Mode Options

#### Option 1: Keep Privacy Mode ON (Recommended)
**Status**: ✅ This is what we're using now

**Pros**:
- More privacy-friendly
- Bot only responds when explicitly called
- Less processing/bandwidth

**Cons**:
- Users must mention the bot (@reysablue_bot message)
- Or reply to bot's previous messages

**User Experience**:
```
✅ @reysablue_bot what's the weather?
✅ [Reply to bot's message] thanks!
❌ just what's the weather? (bot won't see this)
```

#### Option 2: Turn Privacy Mode OFF
**Status**: ⚠️ Optional, not required

**How to disable**:
1. @BotFather → /mybots
2. Select @reysablue_bot
3. Bot Settings → Group Privacy
4. Tap **Turn OFF**

**Pros**:
- Bot sees all messages in group
- Can respond without mentions
- More conversational

**Cons**:
- Bot processes every message (resource intensive)
- Less privacy for group members
- Needs filtering to avoid spam responses

---

## ✅ Current Bot Status

Based on the permissions check:

```
✅ Bot is in the group: "Midnight Blue Assistant"
✅ Bot can send messages
✅ Privacy Mode: ON (mentions/replies only)
❌ Bot is not an admin (optional)
```

---

## 📋 Testing Checklist

### 1. Bot is Added to Group
```bash
# Run this to verify:
cd /Users/salingga/Projects/first-agent/chatbot
source .venv/bin/activate
python scripts/check_bot_permissions.py
```

**Expected**: ✅ Bot IS a member of this chat

---

### 2. Bot is Running
```bash
# Start the bot:
python -m src.main
```

**Expected Output**:
```
✅ Connected as bot: @reysa_blue_bot
   Bot name: Reysa
💬 Listening for mentions and replies...
```

---

### 3. Send Test Message in Group

**Option A: Mention the bot** (REQUIRED with Privacy Mode ON)
```
@reysablue_bot hello
```

**Option B: Reply to bot's message**
1. Bot sends a message
2. Click "Reply" on that message
3. Type your response

---

### 4. Check Bot Logs for Debug Output

When you send a message, you should see:
```
📨 Received message in chat -5556749038
   Text: hello
   From: <your_user_id>
   Mention check: True, Reply check: False, Entity mention: True
   ✅ Processing message...
   📤 Sending reply: <bot response>...
```

**If you don't see this**, the bot is not receiving messages!

---

## 🐛 Troubleshooting

### Problem: Bot doesn't respond to @mentions

**Possible causes**:
1. **Privacy Mode is ON** (expected) - Make sure you're using @reysablue_bot
2. **Wrong chat ID** - Check ALLOWED_CHATS in .env
3. **Bot not in group** - Run permissions check script
4. **Bot not running** - Check if process is running

**Solutions**:

#### Check 1: Verify mention format
```
✅ @reysablue_bot hello
✅ @reysa_blue_bot hello (both work)
❌ @reysablu_bot hello (wrong username)
❌ just hello (no mention)
```

#### Check 2: Verify chat ID
```bash
cat .env | grep ALLOWED_CHATS
# Should show: ALLOWED_CHATS=-5556749038
```

#### Check 3: Verify bot is running with debug output
```bash
python -m src.main
# Keep this terminal open to see debug logs
```

#### Check 4: Send test message and watch logs
In Telegram:
```
@reysablue_bot test
```

In terminal, you should immediately see:
```
📨 Received message in chat -5556749038
```

If you DON'T see this, the bot is not receiving the message!

---

### Problem: Bot sees message but doesn't respond

**Check logs for**:
```
📨 Received message in chat -5556749038
   Text: hello
   Mention check: False, Reply check: False, Entity mention: False
   ❌ Ignoring - not a mention or reply to bot
```

This means the mention wasn't detected.

**Solutions**:
1. Make sure you're typing the full username: `@reysablue_bot` or `@reysa_blue_bot`
2. Check if there's a space after the @mention: `@reysablue_bot hello` (✅) not `@reysablue_bothello` (❌)
3. Try using Telegram's auto-complete when typing @reysa...

---

### Problem: Bot shows "Processing message..." but no reply

**Check logs for**:
```
✅ Processing message...
(error talking to Hermes: ...)
```

This means Ollama is not responding.

**Solution**:
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not, start it
ollama serve
```

---

## 📊 Permission Check Results

Run this anytime to check bot status:
```bash
cd /Users/salingga/Projects/first-agent/chatbot
source .venv/bin/activate
python scripts/check_bot_permissions.py
```

**Expected output**:
```
✅ Connected as: @reysa_blue_bot
   Bot ID: 8843794560
   Bot name: Reysa
🔍 Checking chat: -5556749038
   ✅ Chat found: Midnight Blue Assistant
   ✅ Bot IS a member of this chat
   📋 Bot permissions:
      - Can send messages: True
      - Is admin: False
```

---

## 🚀 Quick Start Commands

```bash
# 1. Check bot permissions
python scripts/check_bot_permissions.py

# 2. Start bot with debug output
python -m src.main

# 3. In Telegram group, send:
@reysablue_bot hello

# 4. Watch terminal for debug logs
```

---

## 📝 Summary

**Current Configuration**:
- ✅ Bot: @reysablue_bot (ID: 8843794560)
- ✅ Group: Midnight Blue Assistant (ID: -5556749038)
- ✅ Privacy Mode: ON (mentions/replies only)
- ✅ Bot is member of group
- ✅ Bot can send messages

**To use the bot**:
```
@reysablue_bot <your message>
```

**To test**:
```bash
# Terminal 1: Run bot
python -m src.main

# Terminal 2 (or Telegram): Send message
@reysablue_bot test
```

You should see debug output in Terminal 1 showing the message was received and processed!

---

**Last Updated**: 2026-09-02  
**Bot Username**: @reysablue_bot / @reysa_blue_bot  
**Group**: Midnight Blue Assistant (-5556749038)
