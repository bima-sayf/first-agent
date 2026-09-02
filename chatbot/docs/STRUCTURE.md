# Project Structure Guide

This document explains the organization of the Hermes Telegram Bot project.

## Directory Structure

```
chatbot/
├── PROJECT-CONTEXT.md         # 📘 Main Knowledge Hub
├── README.md                  # 📄 Quick Start Guide  
├── docs/                      # 📚 Documentation
├── src/                       # 💻 Source Code
├── scripts/                   # 🔧 Utility Scripts
├── tests/                     # 🧪 Test Suite
├── session/                   # 🔐 Runtime Data (git-ignored)
├── logs/                      # 📋 Logs (git-ignored)
└── [config files]             # ⚙️ Configuration
```

---

## 📘 Main Knowledge Hub (Root Level)

### PROJECT-CONTEXT.md
**The central reference document** for understanding the entire project.

**Content**:
- Architecture overview
- Design decisions
- Technical implementation details
- Component descriptions
- Data flow diagrams
- External dependencies
- Use cases and limitations

**When to read**: 
- Starting work on the project
- Need to understand how things work
- Making architectural decisions
- Onboarding new developers

**Location**: Root level for easy discoverability

---

## 📚 Documentation (`docs/`)

Supporting documentation that complements the main knowledge hub.

| File | Purpose |
|------|---------|
| `BACKLOGS.md` | Feature roadmap, task tracking, and priorities |
| `CHANGELOG.md` | Version history and release notes |
| `CRITICAL-FIX-SUMMARY.md` | Technical deep-dive: event loop bug fix |
| `GROUP-SETUP-GUIDE.md` | How to configure bot for Telegram groups |
| `STRUCTURE.md` | This file - project organization guide |
| `REORGANIZATION-SUMMARY.md` | Details of project reorganization |
| `ORGANIZATION-COMPLETE.md` | Summary of completed organization |
| `UX-004-ASSESSMENT.md` | Technical assessment for group chat feature |
| `UX-004-IMPLEMENTATION-COMPLETE.md` | Group chat implementation summary |

**When to add here:**
- User guides and tutorials
- Feature-specific documentation
- Implementation summaries
- Migration guides
- Roadmaps and planning docs

**Note**: The main README is at root for quick start, not in docs/

---

## 💻 Source Code (`src/`)

Contains the bot application code as a proper Python package.

```
src/
├── __init__.py          # Package metadata and version
└── main.py              # Main bot application
```

**Structure:**
- Uses Python module structure (`python -m src.main` to run)
- All imports are from `src.module_name`
- Easily extensible for future modules

**Future expansion:**
```
src/
├── __init__.py
├── main.py              # Entry point
├── bot/                 # Bot logic
│   ├── __init__.py
│   ├── client.py        # Telegram client wrapper
│   └── handlers.py      # Event handlers
├── llm/                 # LLM integration
│   ├── __init__.py
│   └── ollama.py        # Ollama API client
├── storage/             # Data persistence
│   ├── __init__.py
│   └── history.py       # Conversation history
└── config.py            # Configuration management
```

---

## 🔧 Scripts (`scripts/`)

Utility scripts for deployment, maintenance, and operations.

| File | Purpose |
|------|---------|
| `entrypoint.sh` | Docker container entrypoint with security setup |

**Future additions:**
- `backup_session.sh` - Backup Telegram session
- `restore_session.sh` - Restore from backup
- `health_check.sh` - Container health monitoring
- `export_history.sh` - Export conversation data
- `migrate_db.sh` - Database migrations

**Guidelines:**
- All scripts should be executable (`chmod +x`)
- Include shebang line (`#!/bin/bash` or `#!/usr/bin/env python3`)
- Add error handling (`set -e` for bash)
- Document parameters and usage in comments

---

## 🧪 Tests (`tests/`)

Test suite for ensuring code quality and catching regressions.

```
tests/
├── __init__.py
└── test_eventloop.py    # Event loop verification test
```

**Future structure:**
```
tests/
├── __init__.py
├── conftest.py          # pytest fixtures
├── unit/                # Unit tests
│   ├── test_config.py
│   ├── test_ollama.py
│   └── test_history.py
├── integration/         # Integration tests
│   └── test_bot_flow.py
└── fixtures/            # Test data
    └── sample_responses.json
```

**Guidelines:**
- Use `pytest` framework
- Name test files `test_*.py`
- Run with: `pytest tests/`
- Add `__init__.py` to make discoverable

---

## 🔐 Session (`session/`)

**Git-ignored** - Contains Telegram authentication tokens.

```
session/
└── hermes_userbot.session      # Created on first login
└── hermes_userbot.session-journal  # SQLite journal
```

**Security:**
- Files automatically get `600` permissions (owner only)
- Never commit to version control (`.gitignore` protects this)
- Backup separately if needed
- Treat as equivalent to passwords

**Backup strategy:**
```bash
# Backup
tar -czf telegram_session_backup.tar.gz session/
# Encrypt
gpg --encrypt telegram_session_backup.tar.gz

# Restore
gpg --decrypt telegram_session_backup.tar.gz.gpg > telegram_session_backup.tar.gz
tar -xzf telegram_session_backup.tar.gz
```

---

## 📋 Logs (`logs/`)

**Git-ignored** - Runtime logs and debug output.

```
logs/
├── .gitkeep            # Ensures directory exists in git
└── error.log           # Runtime errors (created as needed)
```

**Future logs:**
- `bot.log` - General application logs
- `ollama.log` - LLM API interactions
- `telegram.log` - Telegram API calls
- `access.log` - Message handling events

**Log rotation:**
Add to a future script:
```bash
# Rotate logs older than 7 days
find logs/ -name "*.log" -mtime +7 -exec gzip {} \;
find logs/ -name "*.log.gz" -mtime +30 -delete
```

---

## ⚙️ Configuration Files (Root)

Configuration files at the root level:

### Environment & Secrets
- `.env` - **Git-ignored** - Your actual credentials
- `.env.example` - Template for required variables

### Python
- `requirements.txt` - Python dependencies
- `src/__init__.py` - Package version info

### Docker
- `Dockerfile` - Container image definition
- `docker-compose.yml` - Multi-container orchestration
- `.dockerignore` - Files to exclude from Docker build

### Version Control
- `.gitignore` - Files to exclude from git
- `.gitkeep` - Placeholder files to track empty directories

### Documentation
- `README.md` - Quick start guide (links to `docs/`)

---

## Why This Structure?

### Separation of Concerns
- **Code** (`src/`) - What the application does
- **Scripts** (`scripts/`) - How to deploy/maintain it
- **Tests** (`tests/`) - How to verify it works
- **Docs** (`docs/`) - How to understand and use it
- **Data** (`session/`, `logs/`) - Runtime state

### Scalability
Easy to add new components:
- New feature → new module in `src/`
- New maintenance task → new script in `scripts/`
- New test → new file in `tests/`
- New documentation → new file in `docs/`

### Standards Compliance
Follows Python best practices:
- Package structure (`src/` layout)
- Importable modules
- Separate tests directory
- Documentation outside code

### Docker Optimization
- `.dockerignore` excludes docs/tests from image
- Only copies `src/` and `scripts/` into container
- Smaller, faster builds
- Security: no accidental inclusion of `.env` or `session/`

---

## Migration Notes

### Changes from Original Structure

**Before:**
```
chatbot/
├── main.py              # Root level
├── entrypoint.sh        # Root level
├── test_eventloop.py    # Root level
├── README.md            # Root level
├── BACKLOGS.md          # Root level
└── ...                  # All files at root
```

**After:**
```
chatbot/
├── src/main.py          # Organized
├── scripts/entrypoint.sh # Organized
├── tests/test_eventloop.py # Organized
├── docs/README.md       # Organized
└── README.md            # Quick start at root
```

**Impact:**
- Docker needs `scripts/entrypoint.sh` path update ✅
- Python runs as `python -m src.main` ✅
- Imports use `from src.main import ...` ✅
- Documentation paths updated in links ✅

---

## Future Enhancements

See `BACKLOGS.md` for planned additions:

1. **Configuration module** (`src/config.py`)
2. **Logging module** (`src/logging.py`)
3. **Storage layer** (`src/storage/`)
4. **Plugin system** (`src/plugins/`)
5. **Web interface** (new `web/` directory)
6. **Monitoring** (new `monitoring/` directory)

---

## Quick Reference

### Running the bot
```bash
# Docker (production)
docker compose up -d

# Local development
python -m src.main
```

### Running tests
```bash
cd tests
python test_eventloop.py
```

### Adding a new module
```bash
# Create module
touch src/new_module.py

# Import in code
from src.new_module import SomeClass
```

### Adding documentation
```bash
# Create new doc
touch docs/NEW_FEATURE.md

# Link from README.md
[New Feature](docs/NEW_FEATURE.md)
```

---

**Last Updated**: 2026-09-01  
**Maintainer**: Project Team
