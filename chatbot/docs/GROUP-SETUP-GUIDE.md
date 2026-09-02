# Group Setup Guide

This guide explains how to configure the bot to work in a Telegram group instead of (or in addition to) Saved Messages.

---

## Quick Setup for "First-Agent" Group

### Step 1: Get the Group Chat ID

**Option A: Using the helper script** (Recommended)
```bash
# Run from chatbot directory
cd /Users/salingga/Projects/first-agent/chatbot

# Make sure you're in a group called "First-Agent" first
python scripts/get_chat_id.py
```

This will list all your chats with their IDs. Look for "First-Agent" and copy its Chat ID.

**Option B: Using Telegram Bot**
1. Add bot `@userinfobot` to your "First-Agent" group
2. It will display the group's chat ID
3. Remove the bot after getting the ID

**Option C: From bot logs**
1. Temporarily add this debug code to `src/main.py`:
```python
@client.on(events.NewMessage)
async def debug(event):
    print(f"Chat: {event.chat_id} - {await event.get_chat()}")
```
2. Send a message in the group
3. Check the logs for the chat ID
4. Remove the debug code

---

### Step 2: Update Configuration

Edit your `.env` file:

```bash
# For "First-Agent" group only
ALLOWED_CHATS=-1001234567890  # Replace with actual chat ID

# For both Saved Messages and group
ALLOWED_CHATS=me,-1001234567890  # Replace with actual chat ID
```

**Note**: The chat ID is usually a large negative number for groups (e.g., `-1001234567890`).

---

### Step 3: Invite Your Account to the Group

The bot runs as a userbot (your account), so:
1. Make sure YOUR account is a member of "First-Agent" group
2. You need to have permission to read/send messages in that group

---

### Step 4: Restart the Bot

```bash
# If running in Docker
docker compose down
docker compose up -d

# Check logs to verify
docker compose logs -f bot
```

You should see:
```
Allowed chats: -1001234567890
✅ Connected to Telegram
💬 Listening for messages in configured chats...
```

---

### Step 5: Test It

Send a message in the "First-Agent" group. The bot should respond with 🤖 prefix.

---

## Configuration Options

### Single Chat (Group Only)
```bash
ALLOWED_CHATS=-1001234567890
```
Bot responds ONLY in this group, not in Saved Messages.

---

### Multiple Chats
```bash
ALLOWED_CHATS=me,-1001234567890,-1009876543210
```
Bot responds in:
- Your Saved Messages (`me`)
- First-Agent group (`-1001234567890`)
- Another group (`-1009876543210`)

Each chat maintains separate conversation history.

---

### Saved Messages Only (Default)
```bash
ALLOWED_CHATS=me
```
Original behavior - bot only works in your Saved Messages.

---

## How It Works

### Per-Chat History

Each chat has its own conversation history:
- Messages in "First-Agent" group don't affect Saved Messages history
- Messages in Saved Messages don't affect group history
- Each chat is completely isolated

### Self-Reply Prevention

The bot checks for 🤖 prefix and won't reply to its own messages, preventing loops.

### Privacy

**Important**: In groups:
- All members can see the bot's responses
- The bot (your account) sees ALL messages in the group
- Consider privacy implications before using in public/large groups

---

## Troubleshooting

### Bot doesn't respond in group

**Check 1**: Is your account in the group?
```bash
# Run the chat ID script to see your chats
python scripts/get_chat_id.py
```

**Check 2**: Is the chat ID correct in `.env`?
```bash
# Check your configuration
cat .env | grep ALLOWED_CHATS
```

**Check 3**: Restart the bot
```bash
docker compose restart bot
docker compose logs -f bot
```

**Check 4**: Check bot startup logs
Should see:
```
Allowed chats: -1001234567890
✅ Connected to Telegram
```

---

### Bot responds in wrong chat

**Problem**: Chat ID might be incorrect

**Solution**: Run `python scripts/get_chat_id.py` and verify the ID matches your "First-Agent" group.

---

### History混乱 (Mixed Up)

**Problem**: Messages from different chats affecting each other

**Solution**: This shouldn't happen - each chat has isolated history. If it does:
1. Check logs for errors
2. Restart bot to clear in-memory history
3. Report as a bug

---

### Getting "Permission Denied" errors

**Problem**: Your account might not have permission to send messages in the group

**Solution**:
1. Check group settings - are members allowed to send messages?
2. Are you muted or restricted in the group?
3. Try sending a message manually to verify permissions

---

## Advanced: Response Filtering (Future)

Currently, the bot responds to ALL messages in allowed chats. Future versions will support:

### Mention-Only Mode
```bash
RESPONSE_MODE=mentions
```
Bot only responds when mentioned: `@your_username message`

### Reply-Only Mode
```bash
RESPONSE_MODE=replies
```
Bot only responds to replies to its own messages.

### Per-Chat Configuration
```yaml
# groups.yaml (future)
chats:
  - id: -1001234567890
    name: "First-Agent"
    mode: all  # Respond to all messages
  - id: -1009876543210
    name: "Public Group"
    mode: mentions  # Only when mentioned
```

---

## Security Considerations

### Userbot vs Bot Account

This is a **userbot** (runs as YOUR account), not a bot account:
- ✅ Can read message history
- ✅ Can respond like a normal user
- ✅ No need to add a separate bot
- ⚠️ Uses your account credentials
- ⚠️ All messages sent appear from YOU

### Privacy in Groups

- Bot sees ALL messages in the group
- Other members see bot responses from YOUR account
- Consider using in private/trusted groups only
- Review [Telegram ToS](https://telegram.org/tos) for userbot policies

### Recommendations

1. **Private Groups**: Use in private groups with trusted members
2. **Clear Communication**: Inform group members the bot is active
3. **Monitoring**: Regularly check bot responses for quality
4. **Rate Limiting**: Be mindful of Telegram rate limits in active groups

---

## Migration from Saved Messages

### Keeping Both

Want to use both Saved Messages AND a group?

```bash
ALLOWED_CHATS=me,-1001234567890
```

Both work simultaneously with separate histories!

---

### Moving Completely to Group

Want to ONLY use the group (disable Saved Messages)?

```bash
ALLOWED_CHATS=-1001234567890
```

Saved Messages will no longer trigger the bot.

---

## Examples

### Example 1: Single Private Group
```bash
# .env
ALLOWED_CHATS=-1001234567890
```
Use case: AI discussion group with team members.

---

### Example 2: Saved Messages + Team Group
```bash
# .env
ALLOWED_CHATS=me,-1001234567890
```
Use case: Personal AI assistant + team collaboration.

---

### Example 3: Multiple Groups
```bash
# .env
ALLOWED_CHATS=-1001234567890,-1009876543210,-1007654321098
```
Use case: Multiple project groups, each with separate context.

---

## Getting Help

### Check Logs
```bash
docker compose logs -f bot
```

### Test Connectivity
```bash
# Test if Telegram connection works
python scripts/get_chat_id.py
```

### Verify Chat ID
Make sure the chat ID in `.env` matches the output from `get_chat_id.py`.

---

## FAQ

**Q: Can I use this in public groups?**  
A: Technically yes, but consider privacy and rate limiting. Better for private groups.

**Q: Will other members know it's a bot?**  
A: Messages show from YOUR account. The 🤖 prefix indicates bot responses.

**Q: Can I use different models per chat?**  
A: Not yet - planned for future version (see BACKLOGS.md).

**Q: What if I leave the group?**  
A: Bot won't work in that group anymore (your account isn't a member).

**Q: Can I change the bot prefix?**  
A: Yes, edit `BOT_PREFIX` in `src/main.py`.

---

**Last Updated**: 2026-09-01  
**For**: UX-004 Group Chat Support Implementation
