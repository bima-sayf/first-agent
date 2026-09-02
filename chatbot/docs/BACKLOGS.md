# Chatbot Project Backlogs

## Overview
This document tracks improvements, enhancements, technical debt, and future features for the Hermes Telegram chatbot project.

---

## 🔴 Critical Priority

### Initial State
This state right now is the initial state. I want you to x-check every scripts & docs and remove leftovers from previous version (see all the changes).

then, remove any info that describe changes like ux-004-* or critical-fix-*. the objective that we don't want to confuse the developer and make them overwhelmed with too much information. just keep it simple, neat, and tidy with only important documents describing the latest state.

because this is the initial state.

### Runtime Stability

#### CRIT-001: Telethon Event Loop Conflicts
**Status**: ✅ Done  
**Effort**: Small  
**Completed**: 2026-09-01  
**Description**: Fatal asyncio event loop error causing bot crashes. Telethon client initialization conflicts with `check_ollama_connectivity()` creating a different event loop context.

**Error Details**:
```
RuntimeError: Task got Future attached to a different loop
Fatal error handling updates (this is a bug in Telethon v1.44.0, please report it)
Server closed the connection: 0 bytes read on a total of 8 expected bytes
```

**Root Cause**: 
- `TelegramClient` was initialized at module level with one event loop
- `check_ollama_connectivity()` in `main()` created async tasks in a different event loop
- Event loop mismatch caused RuntimeError in Telethon's update handler

**Tasks**:
- [x] Move TelegramClient initialization inside `main()` function
- [x] Ensure all async operations use the same event loop
- [x] Fix Telethon client lifecycle management
- [x] Add proper exception handling for connection errors
- [x] Test bot startup and message handling stability

**Acceptance Criteria**:
- ✅ Bot starts without event loop errors
- ✅ No "Fatal error handling updates" messages
- ✅ Bot can receive and respond to messages reliably
- ✅ Graceful handling of connection issues

**Implementation Notes**:
- Moved `TelegramClient` initialization from module level into `main()` function
- Event handler registration now happens inside `main()` after client creation
- Added proper `try/finally` block for graceful shutdown
- Enhanced error handling for HTTP status errors from Ollama
- Added KeyboardInterrupt handling at both async and sync levels
- Client disconnection happens in `finally` block to ensure cleanup

---

### Security & Compliance

#### SEC-001: Secure Session File Handling
**Status**: ✅ Done  
**Effort**: Small  
**Completed**: 2026-09-01  
**Description**: The session file contains sensitive authentication tokens and should have restricted permissions.

**Tasks**:
- [x] Add `.gitignore` entry to ensure session files are never committed
- [x] Set file permissions to `600` (owner read/write only) in entrypoint/init script
- [x] Document session backup/recovery process in README
- [x] Add warning in README about Telegram userbot ToS compliance

**Acceptance Criteria**:
- ✅ Session files cannot be accidentally committed
- ✅ Files have restricted permissions on creation
- ✅ Documentation includes security warnings

**Implementation Notes**:
- Created `.gitignore` with session files, `.env`, and Python cache exclusions
- Created `entrypoint.sh` that sets `700` on session directory and `600` on session files
- Updated `Dockerfile` to use entrypoint script
- Enhanced `.dockerignore` to prevent sensitive files from being copied into image
- Added comprehensive security section to README with backup/recovery instructions

---

#### SEC-002: Environment Variable Validation
**Status**: ✅ Done  
**Effort**: Small  
**Completed**: 2026-09-01  
**Description**: Missing or invalid environment variables cause cryptic runtime errors.

**Tasks**:
- [x] Validate `TG_API_ID` and `TG_API_HASH` on startup
- [x] Provide clear error messages for missing/invalid config
- [x] Check Ollama URL format and connectivity on startup
- [x] Exit gracefully with helpful error messages

**Acceptance Criteria**:
- ✅ Bot fails fast with clear error message if config is invalid
- ✅ Startup check validates Ollama connectivity
- ✅ Users see actionable error messages

**Implementation Notes**:
- Added `validate_environment()` function that checks all required env vars
- Validates `TG_API_ID` is a positive integer
- Validates `TG_API_HASH` exists and has reasonable length
- Validates `OLLAMA_URL` is a valid URL format
- Prints detailed error messages with setup instructions on validation failure
- Added `check_ollama_connectivity()` to test Ollama service before starting
- Enhanced startup logging with clear status indicators (✅, ⚠️, ❌)
- Bot warns user if Ollama is unreachable but still starts (graceful degradation)

---

## 🟡 High Priority

### User Experience

#### UX-005: Bot Account Mode (Reply as Different User)
**Status**: 🟡 Open  
**Effort**: Large  
**Description**: Make the bot reply as a separate bot account instead of your personal account, so it doesn't look like you're talking to yourself in the group.

**Current Behavior**:
- Bot runs as **userbot** (your personal Telegram account)
- All responses appear from YOU
- In groups, looks like you're replying to yourself
- Confusing for other group members

**Desired Behavior**:
- Bot replies as a **separate bot account** (like @FirstAgentBot)
- Clear distinction between your messages and bot responses
- More professional appearance in groups
- Other members know it's a bot, not you

---

**Technical Considerations**:

### 1. Userbot vs Bot Account

| Feature | Userbot (Current) | Bot Account (Desired) |
|---------|-------------------|----------------------|
| Authentication | Your phone number | Bot token from @BotFather |
| Appears as | Your name | Bot name |
| Message history | Can read all | Only tagged/replied messages |
| Permissions | Your permissions | Limited bot permissions |
| Setup | Session file | Bot token |
| Telegram Client | `TelegramClient` | `TelegramClient` with bot=True |

### 2. Architecture Change Required

**Current (Userbot)**:
```python
client = TelegramClient("session/hermes_userbot", API_ID, API_HASH)
await client.start()  # Logs in as YOU
```

**Proposed (Bot Account)**:
```python
BOT_TOKEN = os.getenv("BOT_TOKEN")  # From @BotFather
client = TelegramClient("session/bot_session", API_ID, API_HASH)
await client.start(bot_token=BOT_TOKEN)  # Logs in as BOT
```

### 3. Message Handling Differences

**Userbot** (current):
- Sees ALL messages in allowed chats
- Can respond to any message
- No @mentions needed

**Bot Account**:
- Only sees messages that:
  - Mention the bot (`@botname`)
  - Reply to bot's messages
  - Start with `/` (commands)
  - In private chats (all messages)
- Cannot read message history before being added
- More restricted but clearer intent

### 4. Setup Process Changes

**Userbot Setup** (current):
1. Get API_ID and API_HASH from my.telegram.org
2. Run bot, log in with phone number
3. Session file created

**Bot Account Setup**:
1. Talk to @BotFather on Telegram
2. Create new bot (`/newbot`)
3. Get bot token (e.g., `110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`)
4. Add bot token to `.env`
5. Add bot to group as admin (or allow bot access)

### 5. Limitations to Consider

**Bot Account Limitations**:
- ❌ Cannot read messages that don't involve it
- ❌ Cannot initiate conversations (except in private chats)
- ❌ Cannot see message history before being added
- ❌ Requires explicit mentions or replies
- ✅ But appears as separate entity
- ✅ But clearer for groups
- ✅ But doesn't use your personal account

**Impact on Features**:
- ✅ Group chat: Works (with mentions)
- ⚠️ Conversation history: Only from when bot was added
- ⚠️ Response trigger: Requires mention or reply
- ❌ Saved Messages: Doesn't work (bots can't message themselves)

---

**Implementation Options**:

### Option A: Full Migration to Bot Account
**Replace userbot with bot account entirely**

**Pros**:
- Clear separation (bot is bot, you are you)
- Professional appearance
- Follows Telegram bot guidelines
- No ToS concerns

**Cons**:
- Requires mentions (`@botname message`)
- Cannot work in Saved Messages
- Loses ability to see all messages
- Breaking change for users

**Configuration**:
```bash
BOT_TOKEN=110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
ALLOWED_CHATS=-5556749038
```

---

### Option B: Dual Mode (Userbot OR Bot Account)
**Support both modes, user chooses**

**Pros**:
- Flexibility (use userbot for Saved Messages, bot for groups)
- No breaking changes
- Can switch modes

**Cons**:
- More complex configuration
- Need to maintain two code paths
- More testing required

**Configuration**:
```bash
# Userbot mode (current)
BOT_MODE=userbot
TG_API_ID=...
TG_API_HASH=...

# Bot account mode (new)
BOT_MODE=bot
BOT_TOKEN=110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
```

---

### Option C: Hybrid (Two Bots Running)
**Run userbot for monitoring + bot account for responding**

**How it works**:
1. Userbot monitors messages (invisible, doesn't respond)
2. When message detected, userbot triggers bot account
3. Bot account responds (appears as @botname)

**Pros**:
- Can see all messages (userbot)
- Responds as bot (bot account)
- Best of both worlds
- Can respond to any message, not just mentions

**Cons**:
- Complex architecture (two clients)
- More resource intensive
- More complex to maintain
- Potential race conditions

**Would require**:
- Two Telegram clients running
- Message queue between them
- Coordination logic

---

**Tasks**:

- [ ] Decide on implementation approach (A, B, or C)
- [ ] Create bot account via @BotFather
- [ ] Update authentication code to support bot token
- [ ] Update event handlers (bot only sees mentions/replies)
- [ ] Handle message visibility differences
- [ ] Update BOT_PREFIX (or remove if bot name is clear enough)
- [ ] Test in groups with mentions
- [ ] Update configuration (.env.example)
- [ ] Add bot permission setup to documentation
- [ ] Consider migration path for existing users

---

**Recommended Approach**: **Option B (Dual Mode)**

**Why**:
1. **Backward compatible** - Userbot mode still works
2. **Flexible** - Users choose based on use case
3. **Clear migration** - Can switch modes without losing functionality
4. **Salvages Saved Messages** - Userbot mode keeps that working

**Implementation**:
```python
BOT_MODE = os.getenv("BOT_MODE", "userbot")

if BOT_MODE == "bot":
    # Bot account mode
    BOT_TOKEN = os.getenv("BOT_TOKEN")
    client = TelegramClient("session/bot_session", API_ID, API_HASH)
    await client.start(bot_token=BOT_TOKEN)
    # Only listen to mentions/replies
else:
    # Userbot mode (current)
    client = TelegramClient("session/hermes_userbot", API_ID, API_HASH)
    await client.start()
    # Listen to all messages in allowed chats
```

---

**Code Changes Required**:

### 1. Configuration (`src/main.py`)
```python
# Add bot mode configuration
BOT_MODE = os.getenv("BOT_MODE", "userbot")
BOT_TOKEN = os.getenv("BOT_TOKEN") if BOT_MODE == "bot" else None

# Validate bot token if in bot mode
if BOT_MODE == "bot" and not BOT_TOKEN:
    errors.append("❌ BOT_TOKEN required when BOT_MODE=bot")
```

### 2. Client Initialization
```python
if BOT_MODE == "bot":
    client = TelegramClient("session/bot_session", API_ID, API_HASH)
    await client.start(bot_token=BOT_TOKEN)
    print(f"✅ Connected as bot (token: {BOT_TOKEN[:10]}...)")
else:
    client = TelegramClient("session/hermes_userbot", API_ID, API_HASH)
    await client.start()
    print("✅ Connected as userbot")
```

### 3. Event Handler
```python
if BOT_MODE == "bot":
    # Bot mode: only respond to mentions or replies
    @client.on(events.NewMessage(incoming=True, chats=ALLOWED_CHATS))
    async def on_message(event):
        # Check if mentioned or replied to
        if not (event.mentioned or (event.is_reply and await is_reply_to_bot(event))):
            return
        # ... process message
else:
    # Userbot mode: respond to all messages (current behavior)
    @client.on(events.NewMessage(chats=ALLOWED_CHATS))
    async def on_message(event):
        # ... process message (current code)
```

### 4. Bot Prefix
```python
if BOT_MODE == "bot":
    # Bot account is already clear, maybe no prefix needed
    BOT_PREFIX = ""  # Or keep it
else:
    # Userbot needs prefix to identify bot responses
    BOT_PREFIX = "\U0001F916 "
```

---

**Setup Guide for Users**:

### Creating a Bot Account

1. **Open Telegram** and search for `@BotFather`

2. **Create bot**:
   ```
   /newbot
   ```

3. **Choose name**:
   ```
   First Agent Assistant
   ```

4. **Choose username** (must end in 'bot'):
   ```
   FirstAgentBot
   ```

5. **Get token**:
   ```
   Use this token to access the HTTP API:
   110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
   ```

6. **Add to `.env`**:
   ```bash
   BOT_MODE=bot
   BOT_TOKEN=110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
   ALLOWED_CHATS=-5556749038
   ```

7. **Add bot to group**:
   - Go to First-Agent group
   - Add @FirstAgentBot as member
   - Give admin rights (for message access)

8. **Restart bot**:
   ```bash
   docker compose restart bot
   ```

9. **Test**:
   ```
   @FirstAgentBot hello!
   ```

---

**Acceptance Criteria**:

- ✅ Bot can run in bot account mode
- ✅ Bot responds as separate account (not your personal account)
- ✅ Backward compatible (userbot mode still works)
- ✅ Configuration switches between modes
- ✅ Clear documentation for setup
- ✅ Mentions and replies work in bot mode
- ✅ No "talking to yourself" appearance

---

**Effort Estimate**: **Large (2-3 days)**

**Breakdown**:
- Bot mode implementation: 4 hours
- Dual mode configuration: 2 hours
- Event handler updates: 3 hours
- Testing in both modes: 3 hours
- Documentation: 2 hours
- Bot account setup guide: 1 hour
- Migration testing: 1 hour

---

**Dependencies**:
- None (can be implemented independently)
- Complements UX-004 (group chat support)

---

**Related Items**:
- UX-004: Group chat support (already implemented)
- UX-001: Bot commands (would work in both modes)

---

**Breaking Changes**:
- None if Option B (Dual Mode) is chosen
- Default mode remains userbot (backward compatible)
- Users opt-in to bot mode

---

**Security Considerations**:

1. **Bot Token Security**:
   - Token is like a password
   - Must be in `.env` (git-ignored)
   - Don't commit or share publicly

2. **Bot Permissions**:
   - Bot needs to be added to group
   - May need admin rights to see all messages
   - Less powerful than userbot (by design)

3. **Session Files**:
   - Separate session for bot mode (`bot_session`)
   - Won't conflict with userbot session

---

**Future Enhancements** (Post-Implementation):

1. **Mention-only mode** (already considered in design)
2. **Bot commands** (/help, /reset, etc.)
3. **Bot profile picture** (set via @BotFather)
4. **Bot description** (shown in group member list)
5. **Inline queries** (optional advanced feature)

---

### User Experience

#### UX-004: Group Chat Support (Replace Saved Messages)
**Status**: ✅ Done  
**Effort**: Medium  
**Completed**: 2026-09-01  
**Description**: Enable bot to work in a Telegram group instead of (or in addition to) Saved Messages. User will invite the bot to a group and it should respond to messages there.

**Implementation Summary**:
- ✅ Added `ALLOWED_CHATS` environment variable configuration
- ✅ Implemented per-chat conversation history (dict with chat_id as key)
- ✅ Updated event handler to support multiple chat IDs
- ✅ Created helper script to find chat IDs (`scripts/get_chat_id.py`)
- ✅ Configured for "First-Agent" group (chat ID: -5556749038)
- ✅ Backward compatible (defaults to "me" if not set)
- ✅ Documentation created (GROUP-SETUP-GUIDE.md)

**Chat ID**: -5556749038 (First-Agent group)

**Configuration**:
```bash
ALLOWED_CHATS=-5556749038  # First-Agent group only
# or
ALLOWED_CHATS=me,-5556749038  # Both Saved Messages and group
```

**Acceptance Criteria**:
- ✅ Bot can be invited to a Telegram group
- ✅ Bot responds to messages in configured chat(s)
- ✅ Each chat has separate conversation history
- ✅ Configuration specifies which chats are allowed
- ✅ Bot doesn't respond to its own messages
- ✅ Documentation explains setup
- ✅ No breaking changes (backward compatible)

---

**Current Behavior**:
- Bot only monitors "Saved Messages" (chat with yourself)
- Event handler filters for `chats="me"`
- Single-user, single-chat design

**Desired Behavior**:
- Bot can be invited to a group
- Bot responds to messages in that group
- Optional: Support both Saved Messages AND groups

**Technical Considerations**:

1. **Chat ID Handling**:
   - Saved Messages uses `"me"` as chat identifier
   - Groups have numeric chat IDs (negative for supergroups)
   - Need to support multiple chat IDs

2. **Event Filtering**:
   - Current: `@client.on(events.NewMessage(chats="me"))`
   - Needed: `@client.on(events.NewMessage(chats=[chat_id1, chat_id2, ...]))`
   - Or: Listen to all chats and filter in handler

3. **Privacy & Permissions**:
   - In groups, all members see the bot's responses
   - Bot sees all messages in the group (privacy consideration)
   - May want to respond only to:
     - Direct mentions (`@botname`)
     - Reply to bot's messages
     - Commands (starting with `/`)

4. **Conversation Context**:
   - Per-chat history (not shared between chats)
   - History storage needs chat_id as key
   - Current in-memory list won't work for multi-chat

5. **Configuration**:
   - How to specify allowed groups?
     - Environment variable: `ALLOWED_CHATS=-1001234567890,-1009876543210`
     - Config file: `allowed_chats.json`
     - Allowlist vs. all groups bot is member of

**Tasks**:
- [ ] Assess impact on current architecture
- [ ] Decide on chat configuration method (env var vs config file)
- [ ] Decide on response trigger mode:
  - [ ] All messages in allowed chats
  - [ ] Only mentions (`@botname message`)
  - [ ] Only replies to bot's messages
  - [ ] Configurable per chat
- [ ] Update event handler to support multiple chat IDs
- [ ] Implement per-chat conversation history (dict with chat_id as key)
- [ ] Add chat configuration validation on startup
- [ ] Update `BOT_PREFIX` logic (may need to work differently in groups)
- [ ] Test self-reply prevention in group context
- [ ] Document how to get group chat IDs
- [ ] Add group-specific commands (if needed)
- [ ] Update README with group setup instructions

**Configuration Options**:

Option A - Environment Variables:
```bash
# Comma-separated list of allowed chat IDs
ALLOWED_CHATS=-1001234567890,-1009876543210,me
# Response mode: all, mentions, replies
RESPONSE_MODE=mentions
```

Option B - Config File (`groups.yaml`):
```yaml
groups:
  - chat_id: -1001234567890
    name: "AI Discussion Group"
    response_mode: mentions
    system_prompt: "Custom prompt for this group"
  - chat_id: me
    name: "Saved Messages"
    response_mode: all
```

**Code Changes Required**:

1. **Event Handler** (`src/main.py`):
```python
# Current
@client.on(events.NewMessage(chats="me"))

# New
ALLOWED_CHATS = parse_allowed_chats()  # From config
@client.on(events.NewMessage(chats=ALLOWED_CHATS))
async def on_message(event):
    chat_id = event.chat_id
    # Filter based on response mode
    if should_respond(event):
        # Get history for this chat
        history = get_chat_history(chat_id)
        # Process message...
```

2. **History Management**:
```python
# Current: global list
history: list[dict] = []

# New: per-chat dict
chat_histories: dict[int, list[dict]] = {}

def get_chat_history(chat_id: int) -> list[dict]:
    if chat_id not in chat_histories:
        chat_histories[chat_id] = []
    return chat_histories[chat_id]
```

3. **Response Filtering**:
```python
def should_respond(event) -> bool:
    """Determine if bot should respond to this message."""
    # Always ignore bot's own messages
    if event.raw_text.startswith(BOT_PREFIX):
        return False
    
    response_mode = get_response_mode(event.chat_id)
    
    if response_mode == "all":
        return True
    elif response_mode == "mentions":
        # Check if bot is mentioned
        return event.mentioned
    elif response_mode == "replies":
        # Check if replying to bot's message
        return event.is_reply and is_reply_to_bot(event)
    
    return False
```

**Acceptance Criteria**:
- ✅ Bot can be invited to a Telegram group
- ✅ Bot responds to messages based on configured mode
- ✅ Each chat has separate conversation history
- ✅ Configuration specifies which chats are allowed
- ✅ Bot doesn't respond to its own messages in groups
- ✅ Documentation explains how to get chat IDs
- ✅ No breaking changes to Saved Messages functionality

**Effort Estimate**: Medium (1-2 days)
- Configuration parsing: 2 hours
- Event handler updates: 3 hours
- Per-chat history: 2 hours
- Testing in groups: 2 hours
- Documentation: 1 hour

**Dependencies**:
- None (can be done independently)
- Synergy with **PERS-001** (persistent history should include chat_id)
- Synergy with **UX-003** (multi-chat support - this is essentially the same)

**Related Items**:
- **UX-003**: Multi-Chat Support (this can replace/merge with UX-003)
- **PERS-001**: Persistent history needs chat_id in schema

**Breaking Changes**:
- None if we keep "me" (Saved Messages) as default
- Environment variable `ALLOWED_CHATS` should default to `me` for backward compatibility

**Migration Path**:
```bash
# Old behavior (still works)
# No ALLOWED_CHATS set = defaults to "me"

# New behavior
ALLOWED_CHATS=me,-1001234567890  # Both Saved Messages and group
```

---

**Notes for Implementation**:
1. Start with simple "all messages" mode to prove it works
2. Add filtering modes (mentions, replies) after basic works
3. Consider merging this with UX-003 (Multi-Chat Support) - they're essentially the same feature
4. Test thoroughly in both private and supergroups

---

### Persistence & Reliability

#### PERS-001: Persistent Conversation History
**Status**: 🟡 Open  
**Effort**: Medium  
**Description**: Conversation history resets on container restart, breaking context continuity.

**Options**:
1. SQLite database in mounted volume
2. JSON file in session directory
3. Redis for distributed setup

**Tasks**:
- [ ] Design conversation storage schema (message, role, timestamp, chat_id)
- [ ] Implement storage adapter interface
- [ ] Add SQLite backend as default implementation
- [ ] Migrate in-memory history list to storage adapter
- [ ] Add conversation pruning (by date or count limit)
- [ ] Add `/reset` command to clear history manually

**Acceptance Criteria**:
- Conversation history survives bot restarts
- History automatically prunes to prevent unbounded growth
- User can manually reset conversation context

---

#### REL-001: Ollama Health Check & Auto-Reconnect
**Status**: 🟡 Open  
**Effort**: Small  
**Description**: If Ollama container restarts, bot doesn't recover automatically.

**Tasks**:
- [ ] Implement retry logic with exponential backoff
- [ ] Add health check endpoint polling before requests
- [ ] Log connection state changes
- [ ] Send notification to user when connection lost/restored

**Acceptance Criteria**:
- Bot automatically reconnects after Ollama restarts
- User gets notification when service is temporarily unavailable
- Logs clearly show connection state transitions

---

### User Experience

#### UX-001: Bot Commands System
**Status**: 🟡 Open  
**Effort**: Medium  
**Description**: Add Telegram-style commands for bot control.

**Proposed Commands**:
- `/help` - Show available commands
- `/reset` - Clear conversation history
- `/model <name>` - Switch model dynamically
- `/status` - Show bot status (model, history length, uptime)
- `/export` - Export conversation history
- `/system <prompt>` - Change system prompt temporarily

**Tasks**:
- [ ] Implement command parser
- [ ] Add command handler registry
- [ ] Implement each command handler
- [ ] Update documentation with command list
- [ ] Add help text for each command

**Acceptance Criteria**:
- Commands work in Saved Messages
- Help command shows all available commands
- Commands provide feedback on success/failure

---

#### UX-002: Streaming Responses
**Status**: 🟡 Open  
**Effort**: Medium  
**Description**: Show responses as they're generated (like ChatGPT) instead of waiting for completion.

**Tasks**:
- [ ] Switch Ollama API call to use `"stream": true`
- [ ] Implement SSE response parsing with httpx
- [ ] Edit message incrementally as tokens arrive
- [ ] Handle Telegram rate limits (edit throttling)
- [ ] Add "..." indicator while streaming

**Acceptance Criteria**:
- User sees response being typed in real-time
- Telegram rate limits are respected
- Error handling works for interrupted streams

---

#### UX-003: Multi-Chat Support
#### UX-003: Multi-Chat Support
**Status**: 🟡 Superseded by UX-004  
**Effort**: Large  
**Description**: **Note: This item has been superseded by UX-004 (Group Chat Support), which provides a more detailed implementation plan for the same feature.**

Support conversations in multiple chats, not just Saved Messages.

**Tasks**:
- [ ] See UX-004 for detailed task breakdown

**Acceptance Criteria**:
- See UX-004

---

## 🟢 Medium Priority

### Code Quality & Maintainability

#### CODE-001: Add Type Hints
**Status**: 🟢 Open  
**Effort**: Small  
**Description**: Improve code maintainability with comprehensive type hints.

**Tasks**:
- [ ] Add type hints to all function signatures
- [ ] Add return type annotations
- [ ] Use `typing` module for complex types (Dict, List, Optional)
- [ ] Add mypy to development dependencies
- [ ] Configure mypy in `pyproject.toml`
- [ ] Fix all mypy errors

**Acceptance Criteria**:
- All functions have complete type annotations
- `mypy --strict` passes without errors
- CI runs mypy checks

---

#### CODE-002: Error Handling Improvement
**Status**: 🟢 Open  
**Effort**: Small  
**Description**: Replace broad exception handling with specific error types.

**Tasks**:
- [ ] Identify specific exceptions (httpx errors, Telethon errors)
- [ ] Create custom exception classes for domain errors
- [ ] Replace `except Exception` with specific handlers
- [ ] Add structured logging with error context
- [ ] Implement error recovery strategies per error type

**Acceptance Criteria**:
- No bare `except:` or overly broad exception handlers
- Logs include useful context for debugging
- Different error types have appropriate recovery behavior

---

#### CODE-003: Configuration Management
**Status**: 🟢 Open  
**Effort**: Medium  
**Description**: Move hardcoded values to configuration system.

**Tasks**:
- [ ] Create `config.py` module with dataclasses
- [ ] Move all constants to config (BOT_PREFIX, MAX_HISTORY_MESSAGES, etc.)
- [ ] Support YAML/TOML config file (optional, overrides env vars)
- [ ] Add config validation with pydantic
- [ ] Document all configuration options in README

**Acceptance Criteria**:
- No magic numbers/strings in main.py
- Configuration is centralized and documented
- Config validation fails fast with helpful errors

---

#### CODE-004: Add Logging Framework
**Status**: 🟢 Open  
**Effort**: Small  
**Description**: Replace print statements with structured logging.

**Tasks**:
- [ ] Configure Python logging module
- [ ] Add log levels (DEBUG, INFO, WARNING, ERROR)
- [ ] Add log formatting with timestamps
- [ ] Log to file in addition to stdout
- [ ] Add LOG_LEVEL environment variable
- [ ] Add correlation IDs for request tracing

**Acceptance Criteria**:
- All output uses logging instead of print
- Logs are structured and filterable
- Log level configurable via environment variable

---

### Testing

#### TEST-001: Unit Tests
**Status**: 🟢 Open  
**Effort**: Medium  
**Description**: Add unit tests for core functionality.

**Tasks**:
- [ ] Add pytest to dev dependencies
- [ ] Create `tests/` directory structure
- [ ] Mock Ollama API responses
- [ ] Mock Telethon client
- [ ] Test conversation history management
- [ ] Test command parsing
- [ ] Test error handling paths
- [ ] Add coverage reporting

**Acceptance Criteria**:
- Core logic has >80% test coverage
- Tests run in CI
- Mocks isolate unit tests from external dependencies

---

#### TEST-002: Integration Tests
**Status**: 🟢 Open  
**Effort**: Medium  
**Description**: Test bot with real Ollama and mock Telegram.

**Tasks**:
- [ ] Create test docker-compose with test containers
- [ ] Use Telethon's test mode or mock server
- [ ] Test full message flow end-to-end
- [ ] Test error scenarios (Ollama down, network issues)
- [ ] Test session persistence
- [ ] Test model switching

**Acceptance Criteria**:
- Integration tests validate full stack
- Tests can run in CI environment
- Tests cover happy path and error scenarios

---

### Features

#### FEAT-001: Multi-Model Support
**Status**: 🟢 Open  
**Effort**: Medium  
**Description**: Allow switching between multiple models without rebuild.

**Tasks**:
- [ ] Preload multiple models in model-init (configurable list)
- [ ] Add model registry/catalog in config
- [ ] Implement `/model` command to switch at runtime
- [ ] Store current model per chat
- [ ] Show current model in status command
- [ ] Add model-specific system prompts

**Acceptance Criteria**:
- User can switch models with a command
- No rebuild required to add new models
- Model choice persists across restarts

---

#### FEAT-002: Conversation Export
**Status**: 🟢 Open  
**Effort**: Small  
**Description**: Export conversation history in various formats.

**Tasks**:
- [ ] Implement `/export` command
- [ ] Support JSON format export
- [ ] Support Markdown format export
- [ ] Send as Telegram file attachment
- [ ] Add date range filtering
- [ ] Sanitize/anonymize if needed

**Acceptance Criteria**:
- User can export full conversation history
- Export includes timestamps and metadata
- File sent via Telegram

---

#### FEAT-003: Usage Tracking & Rate Limiting
**Status**: 🟢 Open  
**Effort**: Medium  
**Description**: Track API usage and implement rate limiting.

**Tasks**:
- [ ] Add metrics collection (message count, tokens, latency)
- [ ] Implement rate limiter (messages per minute/hour)
- [ ] Add usage statistics command
- [ ] Store metrics in database
- [ ] Add Prometheus metrics endpoint (optional)
- [ ] Alert user when rate limit approached

**Acceptance Criteria**:
- Bot tracks usage metrics
- Rate limiting prevents abuse
- User can view their usage statistics

---

#### FEAT-004: Context Injection
**Status**: 🟢 Open  
**Effort**: Medium  
**Description**: Allow injecting documents/links as additional context.

**Tasks**:
- [ ] Detect URLs in messages
- [ ] Fetch and extract URL content
- [ ] Support file uploads (PDF, TXT)
- [ ] Parse documents and add to context
- [ ] Add `/context` command to manage injected context
- [ ] Implement context expiry/cleanup

**Acceptance Criteria**:
- Bot can read URLs shared in chat
- Uploaded documents are processed and used as context
- Context can be reviewed and cleared

---

## 🔵 Low Priority

### Documentation

#### DOC-001: Architecture Diagrams
**Status**: 🔵 Open  
**Effort**: Small  
**Description**: Add visual diagrams for architecture and data flow.

**Tasks**:
- [ ] Create container architecture diagram
- [ ] Create sequence diagram for message flow
- [ ] Create state diagram for bot lifecycle
- [ ] Add diagrams to PROJECT-CONTEXT.md
- [ ] Use mermaid or ASCII diagrams for version control

**Acceptance Criteria**:
- Diagrams render in markdown viewers
- Diagrams accurately reflect current architecture
- Diagrams help onboard new developers

---

#### DOC-002: API Documentation
**Status**: 🔵 Open  
**Effort**: Small  
**Description**: Document internal APIs and extension points.

**Tasks**:
- [ ] Add docstrings to all functions
- [ ] Generate API docs with Sphinx
- [ ] Document plugin/extension system
- [ ] Add examples for common customizations
- [ ] Host docs on GitHub Pages or similar

**Acceptance Criteria**:
- All public APIs have docstrings
- Generated docs are accessible online
- Examples demonstrate key extension points

---

### DevOps & Tooling

#### DEVOPS-001: CI/CD Pipeline
**Status**: 🔵 Open  
**Effort**: Medium  
**Description**: Automate testing and deployment.

**Tasks**:
- [ ] Create GitHub Actions workflow
- [ ] Run tests on PR
- [ ] Build and push Docker images
- [ ] Add linting (ruff, black)
- [ ] Add security scanning (bandit, safety)
- [ ] Tag releases automatically

**Acceptance Criteria**:
- PRs run full test suite
- Docker images published on merge
- Code quality checks enforced

---

#### DEVOPS-002: Development Environment
**Status**: 🔵 Open  
**Effort**: Small  
**Description**: Improve local development experience.

**Tasks**:
- [ ] Add docker-compose.dev.yml with hot reload
- [ ] Add pre-commit hooks
- [ ] Create Makefile for common tasks
- [ ] Add VS Code devcontainer config
- [ ] Document development setup in CONTRIBUTING.md

**Acceptance Criteria**:
- Code reloads without rebuilding container
- Pre-commit hooks catch issues before commit
- Makefile simplifies common workflows

---

#### DEVOPS-003: Monitoring & Observability
**Status**: 🔵 Open  
**Effort**: Large  
**Description**: Add production monitoring capabilities.

**Tasks**:
- [ ] Add Prometheus metrics exporter
- [ ] Create Grafana dashboards
- [ ] Add health check HTTP endpoint
- [ ] Implement distributed tracing (OpenTelemetry)
- [ ] Add alerting rules
- [ ] Log aggregation (Loki or ELK)

**Acceptance Criteria**:
- Key metrics visible in Grafana
- Alerts fire for critical issues
- Logs are searchable and aggregated

---

### Performance

#### PERF-001: GPU Acceleration
**Status**: 🔵 Open  
**Effort**: Large  
**Description**: Enable GPU support for faster inference.

**Tasks**:
- [ ] Document GPU setup for Linux hosts
- [ ] Add CUDA support to Ollama container
- [ ] Create docker-compose.gpu.yml variant
- [ ] Add GPU metrics monitoring
- [ ] Benchmark CPU vs GPU performance
- [ ] Document macOS limitations

**Acceptance Criteria**:
- GPU acceleration works on Linux with NVIDIA
- Documentation covers setup steps
- Performance improvement measured and documented

---

#### PERF-002: Response Caching
**Status**: 🔵 Open  
**Effort**: Medium  
**Description**: Cache responses to identical questions.

**Tasks**:
- [ ] Implement message hash function
- [ ] Add cache storage (Redis or in-memory)
- [ ] Check cache before calling Ollama
- [ ] Add cache TTL configuration
- [ ] Add `/clearcache` command
- [ ] Add cache hit/miss metrics

**Acceptance Criteria**:
- Identical questions return cached responses instantly
- Cache respects configured TTL
- Cache can be manually cleared

---

#### PERF-003: Parallel Request Handling
**Status**: 🔵 Open  
**Effort**: Medium  
**Description**: Handle multiple concurrent requests efficiently.

**Tasks**:
- [ ] Add request queue system
- [ ] Implement concurrent request limiting
- [ ] Add per-chat request locks
- [ ] Handle backpressure gracefully
- [ ] Add queue metrics
- [ ] Test under load

**Acceptance Criteria**:
- Multiple users can interact simultaneously
- System handles load gracefully without crashes
- Queue prevents resource exhaustion

---

## 🎯 Future Ideas (Unprioritized)

### Advanced Features

- **Voice Message Support**: Transcribe voice messages with Whisper, send to LLM
- **Image Analysis**: Use vision models (LLaVA) to analyze shared images
- **Multi-Language Support**: Automatic translation for international users
- **Conversation Summaries**: Automatically generate conversation summaries
- **Scheduled Messages**: Send proactive reminders or updates
- **Group Chat Mode**: Respond to @mentions in group chats
- **Plugin System**: Allow third-party extensions
- **Web Interface**: Alternative UI for conversation management
- **Mobile App**: Native iOS/Android companion app
- **Voice Responses**: TTS for audio replies
- **Sentiment Analysis**: Track conversation tone and adjust responses
- **Knowledge Base Integration**: RAG system with custom documents
- **Multi-User Support**: Single bot instance serving multiple users
- **Federation**: Connect multiple bot instances
- **Blockchain Integration**: Immutable conversation logs

---

## 📊 Backlog Statistics

**Total Items**: 32  
**Completed**: 4 ✅  
**Critical**: 0 (3 completed)  
**High**: 7 (1 completed: UX-004)  
**Medium**: 10  
**Low**: 8  
**Future Ideas**: 15  

**By Category**:
- Runtime Stability: 1 (✅ completed)
- Security & Compliance: 2 (✅ completed)
- User Experience: 5 (1 completed: UX-004, 1 superseded, 1 new: UX-005)
- Persistence & Reliability: 2
- Code Quality: 4
- Testing: 2
- Features: 4
- Documentation: 2
- DevOps: 3
- Performance: 3
- Future Ideas: 15

**Recent Completions**:
- 2026-09-01: UX-004 - Group Chat Support (First-Agent group)
- 2026-09-01: CRIT-001 - Telethon Event Loop Conflicts
- 2026-09-01: SEC-001 - Secure Session File Handling
- 2026-09-01: SEC-002 - Environment Variable Validation

**Recent Additions**:
- 2026-09-01: UX-005 - Bot Account Mode (Reply as different user)

---

## 🏷️ Labels & Tags

- `security` - Security-related improvements
- `bug` - Known bugs to fix
- `enhancement` - New features
- `documentation` - Documentation updates
- `performance` - Performance optimizations
- `technical-debt` - Code quality improvements
- `devops` - Build/deployment infrastructure
- `testing` - Test coverage improvements
- `ux` - User experience enhancements
- `breaking-change` - Changes requiring migration

---

## 📝 Notes

- Priorities are suggestions and can be adjusted based on user needs
- Effort estimates: Small (< 1 day), Medium (1-3 days), Large (> 3 days)
- Status: 🔴 Open, 🟡 In Progress, 🟢 Review, ✅ Done
- This backlog should be reviewed and updated quarterly

---

**Last Updated**: 2026-09-01  
**Maintainer**: Project Team
