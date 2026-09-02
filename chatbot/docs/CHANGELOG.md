# Changelog

All notable changes to the Hermes Telegram Bot project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Fixed (2026-09-01) - Critical Event Loop Bug

#### CRIT-001: Telethon Event Loop Conflicts ✅
- **Fixed RuntimeError**: "Task got Future attached to a different loop"
- **Fixed Fatal Telethon Error**: "Fatal error handling updates (this is a bug in Telethon v1.44.0)"
- **Fixed Connection Errors**: "Server closed the connection: 0 bytes read"

**Root Cause Identified**:
The `TelegramClient` was being initialized at module level (when Python imports the file), creating it in one asyncio event loop. When `main()` ran with `asyncio.run()`, it created a NEW event loop. The client's internal tasks were still attached to the old loop, causing conflicts.

**Changes Made**:
- **Moved client initialization into `main()`**: Now the client is created INSIDE the async function, in the correct event loop
- **Moved event handler registration**: The `@client.on()` decorator now runs inside `main()` after client creation
- **Added proper lifecycle management**:
  - `try/finally` block ensures client disconnection
  - Graceful KeyboardInterrupt handling
  - Client cleanup in finally block
- **Enhanced error handling**:
  - Separate handling for `httpx.HTTPStatusError` with status code display
  - Better exception messages for debugging
  - Graceful shutdown messages

**Impact**:
- ✅ Bot now starts reliably without event loop errors
- ✅ Can receive and respond to messages without crashes
- ✅ Proper cleanup on shutdown (Ctrl+C)
- ✅ Better error messages when things go wrong

---

### Added (2026-09-01) - Critical Security Updates

#### SEC-001: Secure Session File Handling ✅
- **Added `.gitignore`** to prevent accidental commits of sensitive files:
  - Session files (`.session`, `.session-journal`)
  - Environment files (`.env`)
  - Python cache and virtual environments
  - IDE and OS files
  
- **Created `entrypoint.sh`** script for secure initialization:
  - Creates session directory with `700` permissions (owner only)
  - Sets `600` permissions on session files (owner read/write only)
  - Runs before Python application starts
  - Makes entrypoint executable in Dockerfile
  
- **Enhanced `.dockerignore`** to prevent sensitive files from being copied into Docker images:
  - Session files and credentials
  - Development files and documentation
  - IDE and OS-specific files
  
- **Updated `README.md`** with comprehensive security documentation:
  - Security & Privacy section with warnings
  - Session file backup/recovery instructions
  - Telegram ToS compliance notice
  - API credential protection guidelines

#### SEC-002: Environment Variable Validation ✅
- **Added `validate_environment()` function** in `main.py`:
  - Validates `TG_API_ID` is set and is a positive integer
  - Validates `TG_API_HASH` is set and has reasonable length (32+ chars)
  - Validates `OLLAMA_URL` is a properly formatted URL
  - Provides detailed error messages with setup instructions
  - Exits gracefully with exit code 1 on validation failure
  
- **Added `check_ollama_connectivity()` function**:
  - Tests Ollama service reachability on startup
  - Uses `/api/tags` endpoint for health check
  - 5-second timeout for quick failure detection
  - Non-blocking (warns but continues if Ollama is down)
  
- **Enhanced startup logging** in `main()`:
  - Clear visual separators with box drawing
  - Emoji indicators (✅ success, ⚠️ warning, ❌ error)
  - Configuration summary (model, URL, history size)
  - Ollama connectivity status
  - Step-by-step startup progress
  - User-friendly instructions

### Changed
- **Dockerfile**: Now uses `entrypoint.sh` instead of direct `CMD` for security initialization
- **main.py**: Validation runs before any configuration is loaded (fail-fast principle)
- **Error messages**: More descriptive and actionable for users

### Security
- Session files now have restricted permissions automatically
- Configuration validation prevents cryptic runtime errors
- Sensitive files are protected from accidental exposure
- Clear documentation of security considerations

---

## File Changes Summary

### New Files
- `.gitignore` - Protects sensitive files from version control
- `entrypoint.sh` - Secure initialization script
- `CHANGELOG.md` - This file
- `PROJECT-CONTEXT.md` - Comprehensive project documentation
- `BACKLOGS.md` - Project roadmap and improvement tracking

### Modified Files
- `main.py` - Added validation, connectivity checks, enhanced logging, **fixed event loop conflicts**
- `Dockerfile` - Uses entrypoint script for secure initialization
- `.dockerignore` - Enhanced to prevent sensitive file copying
- `README.md` - Added Security & Privacy section
- `BACKLOGS.md` - Marked SEC-001, SEC-002, and CRIT-001 as completed

### No Changes Required
- `docker-compose.yml` - Works with new entrypoint
- `requirements.txt` - All dependencies still compatible
- `.env.example` - Already had correct structure

---

## Upgrade Instructions

If upgrading from previous version:

1. **Pull the latest changes**:
   ```bash
   git pull
   ```

2. **Rebuild the Docker image** (to get new entrypoint script):
   ```bash
   docker compose build
   ```

3. **Restart the containers**:
   ```bash
   docker compose up -d
   ```

4. **Verify session permissions** (optional, but recommended):
   ```bash
   ls -la session/
   # Should show: -rw------- (600) for .session files
   # Should show: drwx------ (700) for session/ directory
   ```

5. **Check logs** for new startup messages:
   ```bash
   docker compose logs -f bot
   ```

The bot will now validate configuration on startup and show clear error messages if anything is misconfigured.

---

## Breaking Changes

None. All changes are backward compatible. Existing `.env` files and session files will work without modification.

---

## Testing Checklist

After upgrade, verify:
- [ ] Bot starts successfully with existing `.env`
- [ ] Validation catches missing `TG_API_ID` (test by temporarily removing it)
- [ ] Validation catches invalid `TG_API_ID` (test with non-numeric value)
- [ ] Validation catches missing `TG_API_HASH`
- [ ] Ollama connectivity check shows status on startup
- [ ] Session files have `600` permissions after first run
- [ ] Session directory has `700` permissions
- [ ] Bot still responds to messages in Saved Messages
- [ ] No sensitive files are in git status

---

## Next Steps

See `BACKLOGS.md` for upcoming features. Next priorities:
- **High Priority**: Persistent conversation history (PERS-001)
- **High Priority**: Auto-reconnect to Ollama (REL-001)
- **High Priority**: Bot commands system (UX-001)

---

**Last Updated**: 2026-09-01  
**Contributors**: Project Team
