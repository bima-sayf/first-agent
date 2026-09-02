# Chatbot Project Backlogs

## Overview
This document tracks improvements, enhancements, technical debt, and future features for the Hermes Telegram chatbot project.

---

## 🔴 Critical Priority

### Initial State
This state right now is the initial state. I want you to x-check every scripts & docs and remove leftovers from previous version (see all the changes).

then, remove any info that describe changes like ux-004-* or critical-fix-*. the objective that we don't want to confuse the developer and make them overwhelmed with too much information. just keep it simple, neat, and tidy with only important documents describing the latest state.

Also, check the dockerfile. If it still has previous userbot setup, clean it up. I saw hermes session still generated there. clean it up if we don't need it. In advance, clean every line of code that does not assemble this initial state.

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
**Status**: ✅ Done  
**Effort**: Large  
**Completed**: 2026-09-01  
**Description**: Make the bot reply as a separate bot account instead of your personal account, so it doesn't look like you're talking to yourself in the group.

**Implementation**: Chose **Option A - Full Migration to Bot Account**  
**Bot**: @reysablue_bot (Reysa)  
**Token**: 8843794560:AAHVAfK5VlEHTOXPILib1_UVLpG3NUbKWXE  
**Group**: First-Agent (chat ID: -5556749038)

**See**: `docs/UX-005-IMPLEMENTATION.md` for full implementation details

**Key Changes**:
- Bot runs as @reysablue_bot (not personal account)
- Responds to mentions and replies only
- No 🤖 prefix needed (bot username is clear)
- Session file: `session/reysa_bot.session`

**Acceptance Criteria**:
- ✅ Bot runs as separate account
- ✅ Bot identity is @reysablue_bot  
- ✅ Responds to mentions
- ✅ Responds to replies
- ✅ No "talking to yourself" appearance
- ✅ Per-chat history maintained
- ✅ Works in First-Agent group

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
**Completed**: 5 ✅  
**Critical**: 0 (3 completed)  
**High**: 6 (2 completed: UX-004, UX-005)  
**Medium**: 10  
**Low**: 8  
**Future Ideas**: 15  

**By Category**:
- Runtime Stability: 1 (✅ completed)
- Security & Compliance: 2 (✅ completed)
- User Experience: 5 (2 completed: UX-004 ✅, UX-005 ✅, 1 superseded)
- Persistence & Reliability: 2
- Code Quality: 4
- Testing: 2
- Features: 4
- Documentation: 2
- DevOps: 3
- Performance: 3
- Future Ideas: 15

**Recent Completions**:
- 2026-09-01: UX-005 - Bot Account Mode (@reysablue_bot)
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
