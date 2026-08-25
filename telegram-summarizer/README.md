# Telegram Chat Summarizer

A simple one-shot script that fetches messages from your Telegram chats over the last N days, summarizes them using a Claude managed agent, and saves the results locally and to your Telegram Saved Messages.

Perfect for weekly catch-ups when you're on leave and want to see what you missed.

## ✨ Features

- 📅 **Time-based fetching**: Get messages from the last N days (not just last N messages)
- 🤖 **AI-powered summarization**: Uses your Claude managed agent for intelligent categorization
- 💾 **Local storage**: Saves summaries as markdown files with timestamps
- 📱 **Telegram integration**: Automatically sends summaries to your Saved Messages
- 🎯 **One-shot execution**: Run when you need it, not continuously
- ⚙️ **Easy configuration**: All settings in `.env` file

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure

```bash
# Copy the example configuration
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use your preferred editor
```

You'll need:
- **Telegram API credentials** from https://my.telegram.org/apps
- **Anthropic API key** from https://console.anthropic.com/
- **Claude Agent ID** (your existing managed agent)
- **List of chats** to summarize (comma-separated)

See [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions.

### 3. Run It

```bash
# First run: summarizes last N days (from DEFAULT_DAYS in .env)
python3 summarize.py

# Subsequent runs: only summarizes NEW messages since last run
python3 summarize.py

# Force re-summarize everything
python3 summarize.py --force --days 7

# Specify different time range
python3 summarize.py --days 14
```

### Smart State Tracking

The script automatically tracks when each chat was last summarized:
- **First run**: Fetches messages from last N days
- **Subsequent runs**: Only fetches NEW messages since last summary
- **Skip today**: If already summarized today, automatically skips
- **Force mode**: Use `--force` to re-summarize regardless of state

### First Run

On first run, you'll be prompted for:
1. Your phone number
2. A verification code (sent to your Telegram app)

After this, a session file is created and you won't need to login again.

## 📋 What It Does

1. **Connects** to your Telegram account
2. **Fetches** messages from specified chats (last N days)
3. **Sends** messages to your Claude agent for categorization
4. **Saves** summaries as markdown files in `summaries/`
5. **Sends** summaries to your Telegram Saved Messages

## 📂 Output

### Local Files
Summaries are saved to `summaries/` with this format:
```
summaries/
├── 2026-08-23_GO-DE-an.md
├── 2026-08-23_Alert_DE_Pipeline.md
└── 2026-08-23_Multidim_inhouse.md
```

Each file contains:
- Chat name and period
- Generated timestamp
- Categorized summary with icons
- Proper markdown structure

### Telegram
Each summary is also sent to your **Saved Messages** on Telegram.

## ⚙️ Configuration

Edit `.env` to configure:

```bash
# Which chats to summarize
CHATS=GO-DE-an,Alert DE Pipeline,Multidim inhouse

# How many days to look back (default)
DEFAULT_DAYS=7

# Your Telegram API credentials
TG_API_ID=your_id
TG_API_HASH=your_hash

# Your Anthropic/Claude credentials
ANTHROPIC_API_KEY=sk-ant-...
CMA_AGENT_ID=agent_01...
```

See [docs/USAGE.md](docs/USAGE.md) for detailed configuration options.

## 📚 Documentation

- [docs/SETUP.md](docs/SETUP.md) - First-time setup guide
- [docs/USAGE.md](docs/USAGE.md) - Configuration and usage details

## 🔒 Security

- **Session file**: `multidim_summary.session` is equivalent to your Telegram login. Keep it private.
- **API keys**: Never commit your `.env` file to git (already in `.gitignore`)
- **Credentials**: The script only reads from your chats, never posts to them (except Saved Messages)

## 💡 Tips

- Run this weekly or whenever you need a catch-up
- Adjust `DEFAULT_DAYS` based on your needs (7 for weekly, 14 for bi-weekly)
- Add or remove chats in `.env` anytime
- Check `summaries/` folder for historical records

## 🐛 Troubleshooting

### "Could not find chat"
- Check the exact chat name in your Telegram app
- Names are case-insensitive but must match exactly
- Use the exact display title from your chat list

### "database is locked"
- Only one instance can run at a time
- Kill any existing process: `pkill -f "python.*summarize.py"`

### "TG_API_ID must be set"
- Make sure you created `.env` from `.env.example`
- Check that all required fields are filled in

### Environment ID
On first run, the script creates a Claude environment and prints:
```
Created environment: env_xxxxx
Add this to your .env to reuse it:
  CMA_ENVIRONMENT_ID=env_xxxxx
```

Copy this to your `.env` to avoid creating new environments each time.

## 📝 License

Personal use project. Use and modify as needed.

## 🙏 Credits

Built with:
- [Telethon](https://github.com/LonamiWebs/Telethon) - Telegram client library
- [Anthropic Claude](https://www.anthropic.com/) - AI summarization
- Python 3.9+
