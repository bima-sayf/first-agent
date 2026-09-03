# Documentation Index

Complete documentation for the Reysa Telegram Bot project.

---

## 📘 Start Here

**Quick Start**: [`../README.md`](../README.md)  
Get the bot running in 5 minutes.

**Project Context**: [`../PROJECT-CONTEXT.md`](../PROJECT-CONTEXT.md)  
Understand the architecture and technical details.

---

## 📚 Documentation Files

### Essential Guides
- **[QUICK-START.md](QUICK-START.md)** - Detailed setup walkthrough
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions
- **[PRIVACY-MODE-GUIDE.md](PRIVACY-MODE-GUIDE.md)** - Configure bot response modes
- **[DOCUMENTATION-STANDARDS.md](DOCUMENTATION-STANDARDS.md)** - Where a new document belongs, and
  when not to write one

### Planning & Development
- **[BACKLOGS.md](BACKLOGS.md)** - Open work only (shipped items live in `changelogs/`)
- **[IMPLEMENTATION-PLAN-codeviz-knowledge.md](IMPLEMENTATION-PLAN-codeviz-knowledge.md)** - Local
  chat shell, code-viz knowledge, and critical answering (proposed, not started)

### History
- **[changelogs/](changelogs/)** - Summaries and shipped-feature records
  - `features-shipped-history.md` - what shipped, newest first
  - `cleanup-2026-09-02-initial-state.md` - the v1.0 cleanup

---

## 🗂️ By Audience

### For Users
1. [`../README.md`](../README.md) - Quick start
2. [QUICK-START.md](QUICK-START.md) - Detailed setup
3. [PRIVACY-MODE-GUIDE.md](PRIVACY-MODE-GUIDE.md) - Configure response behavior
4. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Fix common issues

### For Developers
1. [`../PROJECT-CONTEXT.md`](../PROJECT-CONTEXT.md) - Architecture overview
2. [BACKLOGS.md](BACKLOGS.md) - Roadmap and tasks
3. Code: `../src/main.py` - Bot implementation

---

## 📖 Reading Order

### New User Setup
1. **[README.md](../README.md)** - Overview and quick start
2. **[QUICK-START.md](QUICK-START.md)** - Step-by-step setup
3. **[PRIVACY-MODE-GUIDE.md](PRIVACY-MODE-GUIDE.md)** - Configure response mode
4. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - When things go wrong

### Developer Onboarding
1. **[README.md](../README.md)** - Project overview
2. **[PROJECT-CONTEXT.md](../PROJECT-CONTEXT.md)** - Architecture and design
3. **[BACKLOGS.md](BACKLOGS.md)** - Planned features
4. **Source Code** - `../src/main.py`

---

## 🔍 Quick Find

**I want to...**

- **Set up the bot** → [QUICK-START.md](QUICK-START.md)
- **Fix an issue** → [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Change response mode** → [PRIVACY-MODE-GUIDE.md](PRIVACY-MODE-GUIDE.md)
- **Understand architecture** → [`../PROJECT-CONTEXT.md`](../PROJECT-CONTEXT.md)
- **See what's planned** → [BACKLOGS.md](BACKLOGS.md)
- **Test without Telegram / teach the bot code-viz** →
  [IMPLEMENTATION-PLAN-codeviz-knowledge.md](IMPLEMENTATION-PLAN-codeviz-knowledge.md)
- **Find chat IDs** → `../scripts/get_chat_id.py`
- **Check bot permissions** → `../scripts/check_bot_permissions.py`

---

## 📝 Documentation Standards

Full rules: **[DOCUMENTATION-STANDARDS.md](DOCUMENTATION-STANDARDS.md)**. The short version:

1. Summaries go in `docs/changelogs/`, named `{context}-{date}-{detail}.md`
2. `docs/` holds current-state guides only
3. Navigate by `PROJECT-CONTEXT.md` and this index
4. Only `README.md` and `PROJECT-CONTEXT.md` live at the project root

**Do not write a summary document for routine work** — the commit message is the record. Changelog
entries are for milestones, migrations and restructures.

### Purpose
- **README.md** - Project overview and quick start
- **PROJECT-CONTEXT.md** - Technical architecture
- **QUICK-START.md** - Detailed setup instructions
- **TROUBLESHOOTING.md** - Problem resolution
- **PRIVACY-MODE-GUIDE.md** - Feature configuration
- **BACKLOGS.md** - Open work only
- **changelogs/** - History and shipped features

---

## 🔗 External References

- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Telethon Documentation**: https://docs.telethon.dev/
- **Ollama**: https://ollama.ai/
- **Hermes 3 Model**: https://huggingface.co/NousResearch/Hermes-3-Llama-3.1-8B
- **@BotFather**: https://t.me/BotFather

---

**Version**: 1.0  
**Last Updated**: 2026-09-02  
**Bot**: @reysablue_bot (Reysa)
