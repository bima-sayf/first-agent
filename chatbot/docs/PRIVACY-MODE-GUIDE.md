# Privacy Mode Guide

How to control when your bot responds to messages.

---

## 🎯 Two Response Modes

Your bot can work in two ways:

### **Mode 1: Mention-Only (Privacy Mode ON)**
- Bot only sees messages that mention it
- Users must type `@reysablue_bot <message>`
- More privacy-friendly
- Less noisy

### **Mode 2: All Messages (Privacy Mode OFF)** ⭐ **CURRENT**
- Bot sees ALL messages in the group
- Responds to every message
- More conversational
- No @mention needed

---

## 🔧 How to Switch Modes

### **To Enable "Respond to All Messages"** ⭐ **DO THIS**

**Step 1: Disable Privacy Mode in Telegram**
1. Open Telegram
2. Message **@BotFather**
3. Send: `/mybots`
4. Select: **@reysablue_bot**
5. Tap: **Bot Settings**
6. Tap: **Group Privacy**
7. Tap: **Turn OFF** (disable privacy mode)

You'll see: "Privacy mode is disabled for @reysablue_bot"

**Step 2: Code Update**
✅ Already done! The code now responds to all messages.

**Step 3: Restart Bot**
```bash
cd /Users/salingga/Projects/first-agent/chatbot
source .venv/bin/activate
python -m src.main
```

**Step 4: Test**
In your group, just type:
```
hello
```

No @mention needed! Bot will respond.

---

### **To Enable "Mention-Only Mode"**

If you want to go back to requiring @mentions:

**Step 1: Enable Privacy Mode in Telegram**
1. @BotFather → `/mybots`
2. Select @reysablue_bot
3. Bot Settings → Group Privacy
4. Tap **Turn ON**

**Step 2: Update Code**
Change the event handler to check for mentions again (I can help with this).

---

## ⚙️ Current Configuration

**Status**: ✅ **Responds to ALL messages**

**Bot Behavior**:
- ✅ Responds to any message in the group
- ✅ No @mention required
- ✅ Ignores its own messages
- ✅ Per-chat conversation history

**Requirements**:
- ⚠️ **Privacy Mode must be OFF** in @BotFather
- ⚠️ Bot sees ALL messages (more processing)

---

## 🧪 Testing

### Test 1: Normal Message (No Mention)
**Send in group**:
```
what's the weather?
```

**Expected**: Bot responds ✅

### Test 2: With Mention
**Send in group**:
```
@reysablue_bot hello
```

**Expected**: Bot responds (mention is optional now) ✅

### Test 3: Bot's Own Messages
**Bot sends**: "Hello!"  
**Expected**: Bot ignores its own message ✅

---

## 📊 Comparison

| Feature | Privacy ON (Mentions) | Privacy OFF (All Messages) |
|---------|----------------------|----------------------------|
| **Privacy Mode** | ON | OFF ⭐ |
| **User must @mention** | Yes | No |
| **Responds to replies** | Yes | Yes |
| **Responds to any message** | No | Yes ⭐ |
| **Processing load** | Low | Higher |
| **Group privacy** | Better | Lower |
| **Conversational** | Less | More ⭐ |

---

## 🔍 How to Check Current Mode

Run the bot and look at startup message:

**Privacy Mode OFF** (All messages):
```
💬 Listening for ALL messages in configured chats...
   ⚠️  Make sure Privacy Mode is OFF in @BotFather
   Bot will respond to every message in the chat
```

**Privacy Mode ON** (Mentions only):
```
💬 Listening for mentions and replies in configured chats...
   Mention me with: @reysa_blue_bot <your message>
```

Or check in @BotFather:
```
/mybots → @reysablue_bot → Bot Settings → Group Privacy
```

---

## ⚠️ Important Notes

### **If Privacy Mode is ON but Code Expects All Messages**

**Symptom**: Bot doesn't respond to normal messages

**Solution**: Disable Privacy Mode in @BotFather:
```
@BotFather → /mybots → @reysablue_bot → Bot Settings → Group Privacy → Turn OFF
```

### **If Privacy Mode is OFF but You Only Want Mentions**

**Symptom**: Bot responds to EVERY message (annoying)

**Solution**: Update code to check for mentions:
```python
# Add mention check back
if not (is_mention or is_reply_to_bot):
    return
```

---

## 🚀 Quick Start (Current Setup)

**To run bot in "respond to all" mode**:

1. **Disable Privacy Mode** (do once):
   ```
   @BotFather → /mybots → @reysablue_bot → Group Privacy → Turn OFF
   ```

2. **Start bot**:
   ```bash
   python -m src.main
   ```

3. **Test in group** (no mention needed):
   ```
   hello
   ```

4. **Bot responds**: ✅

---

## 📝 Summary

**Current Mode**: ✅ **Responds to ALL messages**

**What you need to do**:
1. Go to @BotFather
2. Disable Privacy Mode for @reysablue_bot
3. Restart the bot
4. Send any message in the group (no @mention needed)

**That's it!** The code is already updated to handle all messages.

---

**Last Updated**: 2026-09-02  
**Mode**: All Messages (Privacy OFF)  
**Bot**: @reysablue_bot
