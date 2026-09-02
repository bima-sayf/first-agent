# UX-005: Bot Account Mode - Assessment

**Created**: 2026-09-01  
**Priority**: 🟡 High  
**Effort**: Large (2-3 days)  
**Status**: Needs Decision

---

## Executive Summary

**Request**: Make the bot reply as a separate bot account instead of your personal account, so group conversations don't look like you're talking to yourself.

**Current State**: Bot runs as **userbot** (your personal Telegram account)  
**Desired State**: Bot runs as **bot account** (@FirstAgentBot or similar)

**Feasibility**: ✅ **Feasible**  
**Complexity**: 🟡 **Medium-High**  
**Recommendation**: **Implement Dual Mode** (Option B)

---

## The Problem

### Current Behavior (Userbot)
```
👤 You: Hey, what's the weather?
👤 You: 🤖 The weather today is sunny...
```
❌ **Looks like you're replying to yourself**  
❌ **Confusing for other group members**  
❌ **Not professional**

### Desired Behavior (Bot Account)
```
👤 You: Hey @FirstAgentBot, what's the weather?
🤖 FirstAgentBot: The weather today is sunny...
```
✅ **Clear who is bot**  
✅ **Professional appearance**  
✅ **Follows Telegram conventions**

---

## Technical Analysis

### Userbot vs Bot Account

| Aspect | Userbot (Current) | Bot Account (Proposed) |
|--------|-------------------|------------------------|
| **Identity** | Your personal account | Separate bot identity |
| **Authentication** | Phone number + code | Bot token from @BotFather |
| **Message Access** | All messages in chat | Only mentions, replies, commands |
| **Appearance** | Your name & profile pic | Bot name & custom pic |
| **Permissions** | Your user permissions | Bot-specific permissions |
| **Setup** | Session file from login | Token from @BotFather |
| **Telegram ToS** | Gray area | Officially supported |
| **Private Chats** | Can initiate | User must initiate |
| **History Access** | Full history | Only after bot added |

---

## Implementation Options

### Option A: Full Migration
**Replace userbot entirely with bot account**

#### Pros:
- ✅ Simplest code (single mode)
- ✅ Clear bot identity
- ✅ Follows Telegram best practices
- ✅ No ToS concerns

#### Cons:
- ❌ Breaking change (loses userbot features)
- ❌ Requires mentions to respond
- ❌ Can't work in Saved Messages
- ❌ Loses message history access

#### Configuration:
```bash
BOT_TOKEN=110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
```

**Verdict**: ❌ **Not Recommended** - Too limiting

---

### Option B: Dual Mode ⭐ RECOMMENDED
**Support both userbot and bot account modes, user chooses**

#### Pros:
- ✅ Backward compatible
- ✅ Flexible (choose per use case)
- ✅ Can switch modes easily
- ✅ Preserves all functionality
- ✅ Users opt-in to bot mode

#### Cons:
- ⚠️ More code to maintain
- ⚠️ Two authentication paths
- ⚠️ More testing required

#### Configuration:
```bash
# Mode 1: Userbot (current, default)
BOT_MODE=userbot
TG_API_ID=...
TG_API_HASH=...
ALLOWED_CHATS=-5556749038

# Mode 2: Bot account (new)
BOT_MODE=bot
BOT_TOKEN=110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
ALLOWED_CHATS=-5556749038
```

**Verdict**: ✅ **Recommended** - Best balance

---

### Option C: Hybrid (Two Bots)
**Run userbot for monitoring + bot account for responding**

#### How It Works:
1. Userbot listens to all messages (invisible)
2. When message needs response, notifies bot account
3. Bot account sends response (visible)

#### Pros:
- ✅ Can see all messages
- ✅ Responds as bot
- ✅ Best of both worlds

#### Cons:
- ❌ Complex architecture
- ❌ Two clients running
- ❌ Coordination overhead
- ❌ More resources
- ❌ Potential race conditions

**Verdict**: ❌ **Not Recommended** - Too complex

---

## Recommended Approach: Option B (Dual Mode)

### Architecture

```python
# Configuration
BOT_MODE = os.getenv("BOT_MODE", "userbot")  # Default: userbot

if BOT_MODE == "bot":
    # Bot Account Mode
    BOT_TOKEN = os.getenv("BOT_TOKEN")
    client = TelegramClient("session/bot_session", API_ID, API_HASH)
    await client.start(bot_token=BOT_TOKEN)
    
    # Only listen to mentions/replies
    @client.on(events.NewMessage(incoming=True))
    async def on_message(event):
        if event.mentioned or event.is_reply:
            # Process and respond
            ...
            
else:
    # Userbot Mode (current)
    client = TelegramClient("session/hermes_userbot", API_ID, API_HASH)
    await client.start()
    
    # Listen to all messages
    @client.on(events.NewMessage(chats=ALLOWED_CHATS))
    async def on_message(event):
        # Process and respond (current logic)
        ...
```

---

## Code Changes Required

### 1. Configuration Validation
**File**: `src/main.py`

```python
# Add to validate_environment()
BOT_MODE = os.getenv("BOT_MODE", "userbot")

if BOT_MODE not in ["userbot", "bot"]:
    errors.append(f"❌ BOT_MODE must be 'userbot' or 'bot' (got: '{BOT_MODE}')")

if BOT_MODE == "bot":
    BOT_TOKEN = os.getenv("BOT_TOKEN")
    if not BOT_TOKEN:
        errors.append("❌ BOT_TOKEN required when BOT_MODE=bot")
    elif not BOT_TOKEN.count(':') == 1:
        errors.append("❌ BOT_TOKEN format invalid (should be 'id:hash')")
```

### 2. Client Initialization
```python
# Load mode
BOT_MODE = os.getenv("BOT_MODE", "userbot")

if BOT_MODE == "bot":
    BOT_TOKEN = os.getenv("BOT_TOKEN")
    client = TelegramClient("session/bot_session", API_ID, API_HASH)
    print(f"🔐 Starting in BOT mode...")
    await client.start(bot_token=BOT_TOKEN)
    me = await client.get_me()
    print(f"✅ Connected as bot: @{me.username}")
else:
    client = TelegramClient("session/hermes_userbot", API_ID, API_HASH)
    print(f"🔐 Starting in USERBOT mode...")
    await client.start()
    me = await client.get_me()
    print(f"✅ Connected as user: {me.first_name}")
```

### 3. Event Handler
```python
if BOT_MODE == "bot":
    # Bot mode: only respond to mentions or replies
    @client.on(events.NewMessage(incoming=True, chats=ALLOWED_CHATS))
    async def on_message(event):
        # Check if bot is mentioned or message is reply to bot
        if not (event.mentioned or (event.is_reply and await is_reply_to_bot(event))):
            return  # Ignore messages that don't involve bot
        
        text = event.raw_text
        # Remove bot mention from text
        text = text.replace(f"@{me.username}", "").strip()
        
        if not text or text.startswith(BOT_PREFIX):
            return
        
        # ... rest of handler (same)
else:
    # Userbot mode: current behavior
    @client.on(events.NewMessage(chats=ALLOWED_CHATS))
    async def on_message(event):
        # ... current code (unchanged)
```

### 4. Helper Functions
```python
async def is_reply_to_bot(event):
    """Check if message is a reply to the bot."""
    if not event.is_reply:
        return False
    
    replied_msg = await event.get_reply_message()
    return replied_msg.sender_id == (await client.get_me()).id
```

---

## Setup Guide

### Creating Bot Account

1. **Open Telegram**, search for `@BotFather`

2. **Create new bot**:
   ```
   /newbot
   ```

3. **Choose display name**:
   ```
   First Agent Assistant
   ```

4. **Choose username** (must end in `bot`):
   ```
   FirstAgentBot
   ```

5. **Copy bot token**:
   ```
   110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
   ```

6. **Optional: Set bot description**:
   ```
   /setdescription
   @FirstAgentBot
   AI assistant powered by Hermes 3 LLM
   ```

7. **Optional: Set bot profile picture**:
   ```
   /setuserpic
   @FirstAgentBot
   [Upload image]
   ```

### Configuring Bot Mode

1. **Edit `.env`**:
   ```bash
   # Switch to bot mode
   BOT_MODE=bot
   BOT_TOKEN=110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
   ALLOWED_CHATS=-5556749038
   ```

2. **Add bot to group**:
   - Open First-Agent group
   - Click "Add Member"
   - Search for `@FirstAgentBot`
   - Add to group

3. **Set bot permissions** (optional):
   - Group Info → Administrators
   - Add @FirstAgentBot as admin (if needed)
   - Enable: "Access to Messages"

4. **Restart bot**:
   ```bash
   docker compose restart bot
   ```

5. **Test**:
   ```
   @FirstAgentBot hello!
   ```

### Switching Modes

**To Bot Mode**:
```bash
BOT_MODE=bot
BOT_TOKEN=<your_token>
# Remove or comment out TG_API_ID, TG_API_HASH (not needed)
```

**Back to Userbot Mode**:
```bash
BOT_MODE=userbot
# BOT_TOKEN not needed
```

---

## Feature Comparison

| Feature | Userbot Mode | Bot Mode |
|---------|--------------|----------|
| **Saved Messages** | ✅ Works | ❌ Not possible |
| **Group Chat** | ✅ All messages | ⚠️ Mentions/replies only |
| **Message History** | ✅ Full access | ❌ Only after added |
| **Identity** | Your account | Bot account |
| **Appearance** | "Talking to yourself" | Clear bot identity |
| **Setup** | Phone auth | Bot token |
| **Telegram ToS** | Gray area | Official support |
| **Private Chats** | ✅ Can initiate | ⚠️ User initiates |

---

## Migration Path

### For Existing Users

**Current**: Userbot in First-Agent group  
**Goal**: Bot account in First-Agent group

**Steps**:
1. Create bot account via @BotFather
2. Update `.env` with bot mode
3. Add bot to group
4. Restart bot
5. Test with mentions

**No data loss**: Conversation history is in-memory anyway

### Backward Compatibility

- Default mode: `userbot` (no breaking changes)
- Users opt-in to bot mode
- Can switch back anytime

---

## Testing Plan

### Test Cases

#### Userbot Mode (Regression)
1. ✅ Responds to all messages in allowed chats
2. ✅ Maintains per-chat history
3. ✅ Self-reply prevention works
4. ✅ Works in Saved Messages

#### Bot Mode (New)
1. ✅ Responds to mentions (`@botname message`)
2. ✅ Responds to replies to bot messages
3. ✅ Ignores non-mention messages
4. ✅ Bot name appears correctly
5. ✅ No 🤖 prefix needed (bot name is clear)
6. ✅ Maintains per-chat history
7. ✅ Works in multiple groups

#### Mode Switching
1. ✅ Can switch from userbot to bot mode
2. ✅ Can switch from bot to userbot mode
3. ✅ Configuration validation catches errors
4. ✅ Session files don't conflict

---

## Effort Estimate

### Breakdown (2-3 days)

| Task | Effort |
|------|--------|
| Bot mode authentication | 4 hours |
| Dual mode configuration | 2 hours |
| Event handler updates | 3 hours |
| Mention/reply detection | 2 hours |
| Testing both modes | 3 hours |
| Documentation | 2 hours |
| Setup guide for bot creation | 1 hour |
| Migration testing | 1 hour |
| **Total** | **18 hours (~2-3 days)** |

---

## Risks & Mitigations

### Risk 1: Bot Token Exposure
**Risk**: Bot token leaked in logs/code  
**Mitigation**: 
- Store in `.env` (git-ignored)
- Never log full token
- Validate on startup

### Risk 2: Mode Confusion
**Risk**: User unsure which mode they're in  
**Mitigation**:
- Clear startup logging
- Show mode and identity on connect
- Documentation with comparison table

### Risk 3: Lost Functionality
**Risk**: Users expect userbot features in bot mode  
**Mitigation**:
- Clear documentation of differences
- Recommend userbot for Saved Messages
- Recommend bot mode for groups

### Risk 4: Permission Issues
**Risk**: Bot can't see messages in group  
**Mitigation**:
- Document permission requirements
- Check bot admin status
- Error messages guide setup

---

## Success Criteria

- [x] Can run in bot account mode
- [x] Bot appears as separate entity
- [x] Responds to mentions correctly
- [x] Responds to replies correctly
- [x] Backward compatible (userbot still works)
- [x] Configuration is clear
- [x] Setup guide is complete
- [x] No "talking to yourself" in groups

---

## Future Enhancements

After implementing dual mode:

1. **Bot Commands** (UX-001)
   - `/help` - Show commands
   - `/reset` - Clear history
   - `/status` - Bot status

2. **Inline Queries**
   - Type `@FirstAgentBot question` anywhere
   - Get answer without sending message

3. **Bot Settings**
   - `/settings` command
   - Toggle features per group

4. **Webhooks** (alternative to polling)
   - More efficient for bot mode
   - Lower latency

---

## Recommendation

### ✅ Proceed with **Option B: Dual Mode**

**Rationale**:
1. **Backward compatible** - Existing users not affected
2. **Flexible** - Use case determines mode
3. **Future-proof** - Can extend both modes
4. **Low risk** - Users opt-in

**Implementation Priority**: High  
**Estimated Timeline**: 2-3 days  
**Dependencies**: None

---

## Questions for Decision

1. **Bot Name**: What should the bot be called?
   - Suggestion: `FirstAgentBot` or `FirstAgentAssistant`

2. **Default Mode**: Keep `userbot` as default?
   - Recommendation: Yes (backward compatible)

3. **Bot Prefix**: Keep 🤖 in bot mode?
   - Recommendation: No (bot name is clear enough)

4. **Permissions**: Require bot admin in groups?
   - Recommendation: Yes (for message access)

---

**Status**: Ready for implementation pending confirmation  
**Next Steps**: Create bot account and begin implementation
