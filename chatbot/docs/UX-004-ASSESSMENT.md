# UX-004: Group Chat Support - Assessment

**Created**: 2026-09-01  
**Priority**: 🟡 High  
**Effort**: Medium (1-2 days)  
**Status**: Ready for Implementation

---

## Executive Summary

Your request to use the bot in a **Telegram group** instead of (or in addition to) Saved Messages is **feasible and medium effort**. The current architecture supports this with moderate changes to event handling and conversation history management.

---

## Quick Answer

**Q: Will it change the structure a lot?**  
**A: No, the structural changes are moderate:**

### What Stays the Same ✅
- Docker setup
- Ollama integration
- Core message processing logic
- Bot prefix and self-reply prevention
- Environment variable configuration

### What Changes 🔧
- **Event handler** - needs to accept group chat IDs
- **History management** - needs per-chat storage (dict instead of list)
- **Configuration** - add `ALLOWED_CHATS` environment variable
- **Response filtering** - optional: respond only to mentions/replies in groups

### Estimated Work: 1-2 days 📅
- Configuration: 2 hours
- Event handler: 3 hours  
- Per-chat history: 2 hours
- Testing: 2 hours
- Documentation: 1 hour

---

## Technical Assessment

### Current Architecture

```python
# Saved Messages only
@client.on(events.NewMessage(chats="me"))
async def on_saved_message(event):
    # Single global history
    history.append({"role": "user", "content": text})
    reply = await ask_hermes(text)
    await event.respond(BOT_PREFIX + reply)
```

### Proposed Architecture

```python
# Multiple chats (Saved Messages + Groups)
ALLOWED_CHATS = ["me", -1001234567890]  # From env var

@client.on(events.NewMessage(chats=ALLOWED_CHATS))
async def on_message(event):
    chat_id = event.chat_id
    
    # Per-chat history
    if chat_id not in chat_histories:
        chat_histories[chat_id] = []
    
    history = chat_histories[chat_id]
    history.append({"role": "user", "content": text})
    
    reply = await ask_hermes(text, history)
    await event.respond(BOT_PREFIX + reply)
```

---

## Impact Analysis

### 1. Code Changes

#### File: `src/main.py`

**Minimal Changes** (20-30 lines):
- Replace global `history: list` with `chat_histories: dict`
- Parse `ALLOWED_CHATS` env var
- Update event handler decorator
- Add `get_chat_history(chat_id)` function
- Pass history to `ask_hermes()` instead of using global

**Impact**: LOW - Isolated changes, no breaking changes

---

#### File: `.env.example`

**Add**:
```bash
# Allowed chat IDs (comma-separated)
# "me" = your Saved Messages
# Negative numbers = group/supergroup IDs
ALLOWED_CHATS=me
```

**Impact**: NONE - Backward compatible (defaults to "me")

---

### 2. Configuration

**How to Get Group Chat ID**:

```python
# Run bot with this temporary code to get chat ID:
@client.on(events.NewMessage)
async def debug_chat_id(event):
    print(f"Chat ID: {event.chat_id}")
    print(f"Chat name: {await event.get_chat()}")
```

Or use existing Telegram bots like `@userinfobot` in the group.

---

### 3. Conversation History

**Current** (Single chat):
```python
history = []  # Shared globally
```

**Proposed** (Multi-chat):
```python
chat_histories = {
    "me": [],                    # Your Saved Messages
    -1001234567890: [],          # Group 1
    -1009876543210: [],          # Group 2
}
```

**Storage per chat** - No cross-contamination ✅

---

### 4. Privacy Considerations

**In Groups**:
- All group members see the bot's responses
- Bot sees ALL messages in the group (not just mentions)
- Consider adding "mention-only" mode for privacy

**Recommendation**: Add response filtering

```python
def should_respond(event):
    # In groups: only respond if mentioned
    if event.is_group and not event.mentioned:
        return False
    return True
```

---

## Implementation Options

### Option A: Simple (Recommended First)

**Configuration**:
```bash
ALLOWED_CHATS=me,-1001234567890
```

**Behavior**:
- Responds to ALL messages in allowed chats
- Same as current Saved Messages behavior
- Simple to implement and test

**Pros**: Quick, easy to test  
**Cons**: May be noisy in active groups

---

### Option B: Mention-Only (Recommended for Production)

**Configuration**:
```bash
ALLOWED_CHATS=me,-1001234567890
RESPONSE_MODE=mentions  # all, mentions, replies
```

**Behavior**:
- In groups: only respond to `@botname message`
- In Saved Messages: respond to all (no mentions needed)
- Cleaner for group discussions

**Pros**: Not intrusive in groups  
**Cons**: Slightly more complex

---

### Option C: Advanced (Future)

**Configuration** (`groups.yaml`):
```yaml
chats:
  - id: me
    mode: all
  - id: -1001234567890
    name: "AI Team"
    mode: mentions
    system_prompt: "You are an AI expert assistant."
  - id: -1009876543210
    name: "Casual Chat"
    mode: replies
```

**Pros**: Very flexible, per-chat settings  
**Cons**: More complex, can be added later

---

## Migration Path

### Phase 1: Basic Group Support (This PR)
- [x] Add `ALLOWED_CHATS` env var
- [x] Per-chat history storage
- [x] Update event handler
- [x] Test in one group
- [x] Documentation

**Deliverable**: Bot works in groups (responds to all messages)

---

### Phase 2: Smart Filtering (Next PR)
- [ ] Add `RESPONSE_MODE` config
- [ ] Implement mention detection
- [ ] Implement reply detection
- [ ] Add per-chat modes

**Deliverable**: Bot only responds when appropriate

---

### Phase 3: Advanced Features (Later)
- [ ] Per-chat system prompts
- [ ] Per-chat model selection
- [ ] Group admin commands
- [ ] Usage analytics per chat

---

## Code Example

### Minimal Changes Required

```python
# 1. Parse config
ALLOWED_CHATS = os.getenv("ALLOWED_CHATS", "me").split(",")
# Convert to proper types: "me" stays string, numbers to int
ALLOWED_CHATS = [
    c.strip() if c.strip() == "me" else int(c.strip()) 
    for c in ALLOWED_CHATS
]

# 2. Per-chat history
chat_histories: dict[Union[str, int], list[dict]] = {}

def get_chat_history(chat_id) -> list[dict]:
    if chat_id not in chat_histories:
        chat_histories[chat_id] = []
    return chat_histories[chat_id]

# 3. Update event handler
@client.on(events.NewMessage(chats=ALLOWED_CHATS))
async def on_message(event):
    text = event.raw_text
    if not text or text.startswith(BOT_PREFIX):
        return
    
    chat_id = event.chat_id
    history = get_chat_history(chat_id)
    
    async with client.action(event.chat_id, "typing"):
        try:
            reply = await ask_hermes(text, history)  # Pass history
        except httpx.ConnectError:
            reply = "Can't reach Ollama..."
        except Exception as exc:
            reply = f"(error: {exc})"
    
    await event.respond(BOT_PREFIX + reply)

# 4. Update ask_hermes signature
async def ask_hermes(user_text: str, history: list[dict]) -> str:
    history.append({"role": "user", "content": user_text})
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history[-MAX_HISTORY_MESSAGES:]
    # ... rest stays the same
```

**Total changes**: ~30 lines of code

---

## Testing Plan

### 1. Unit Tests
- [x] Parse `ALLOWED_CHATS` correctly
- [x] Per-chat history isolation
- [x] Backward compatibility ("me" only)

### 2. Integration Tests

**Test Case 1**: Saved Messages Only (Current)
```bash
ALLOWED_CHATS=me
# Should work exactly as before
```

**Test Case 2**: Group Only
```bash
ALLOWED_CHATS=-1001234567890
# Should respond in group, NOT in Saved Messages
```

**Test Case 3**: Both
```bash
ALLOWED_CHATS=me,-1001234567890
# Should respond in both, separate histories
```

**Test Case 4**: Multiple Groups
```bash
ALLOWED_CHATS=me,-1001234567890,-1009876543210
# Should work in all three chats independently
```

---

## Risks & Mitigations

### Risk 1: Bot Responds to Itself in Groups
**Mitigation**: `BOT_PREFIX` check already prevents this ✅

### Risk 2: Confused History Between Chats
**Mitigation**: Per-chat dict storage ✅

### Risk 3: Privacy in Public Groups
**Mitigation**: Document clearly + add mention-only mode

### Risk 4: Rate Limiting in Active Groups
**Mitigation**: Add rate limiter (future work)

---

## Breaking Changes

**None** ✅

Backward compatibility maintained:
- Default `ALLOWED_CHATS=me` if not set
- Existing `.env` files work without modification
- Single-chat behavior identical

---

## Documentation Updates

### 1. README.md
Add section: "Using in Groups"
- How to invite bot to group
- How to get group chat ID
- How to configure `ALLOWED_CHATS`

### 2. .env.example
Add `ALLOWED_CHATS` with comments

### 3. PROJECT-CONTEXT.md
Update architecture section with multi-chat design

---

## Performance Impact

**Memory**: Negligible (dict overhead vs single list)  
**CPU**: None (same processing per message)  
**Network**: None (same Telegram/Ollama calls)

**Verdict**: No performance impact ✅

---

## Dependencies

**Blocks**: None  
**Blocked by**: None  
**Synergy with**:
- **PERS-001** - Persistent history should store chat_id
- **UX-001** - Commands need to work in groups too
- **UX-002** - Streaming needs chat_id for editing

---

## Recommendation

### ✅ Proceed with Implementation

**Approach**: Start with **Option A (Simple)**
1. Add `ALLOWED_CHATS` env var
2. Implement per-chat history dict
3. Test thoroughly
4. Document usage

**Time**: 1-2 days for a polished implementation

**Risk**: Low - Changes are isolated and well-understood

---

## Next Steps

1. **Confirm approach** - Does Option A meet your needs?
2. **Get group chat ID** - Invite bot and capture ID
3. **Implement** - Follow the code example above
4. **Test** - Verify in both Saved Messages and group
5. **Document** - Update README with group setup

---

## Questions for You

1. **Single group or multiple?** - Do you need support for multiple groups at once?
2. **Response mode?** - Should bot respond to ALL messages or only mentions?
3. **Privacy concern?** - Are other group members okay with bot seeing all messages?
4. **Existing group?** - Do you already have the group, or creating new?

---

**Status**: Ready to implement pending your confirmation! 🚀

Let me know if you want me to proceed with the implementation or if you have questions about the approach.
