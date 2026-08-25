# Setup Guide

Complete guide to setting up Telegram Chat Summarizer for the first time.

## Prerequisites

- Python 3.9 or higher
- A Telegram account
- An Anthropic account (for Claude API)

## Step 1: Get Telegram API Credentials

1. Visit https://my.telegram.org/apps
2. Log in with your phone number
3. Click "Create new application"
4. Fill in the form:
   - **App title**: `Telegram Summarizer` (or any name)
   - **Short name**: `summarizer`
   - **Platform**: Choose appropriate platform
5. Click "Create application"
6. Copy the credentials:
   - `api_id` (a number)
   - `api_hash` (a long hex string)

⚠️ **Keep these private!** They're equivalent to your Telegram login.

## Step 2: Get Anthropic API Key

1. Visit https://console.anthropic.com/
2. Sign in or create an account
3. Go to "API Keys" section
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-api03-...`)

⚠️ **Keep this private!** It gives access to your Claude account.

## Step 3: Get Your Claude Managed Agent ID

If you already have a managed agent for Telegram summarization:
1. Go to https://console.anthropic.com/agents
2. Find your agent
3. Copy the Agent ID (starts with `agent_...`)

If you don't have one yet:
1. Create a managed agent in the Anthropic Console
2. Configure it for chat summarization
3. Copy the Agent ID

## Step 4: Install Dependencies

```bash
# Navigate to project directory
cd telegram-summarizer

# Create virtual environment (optional but recommended)
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Step 5: Configure the Script

```bash
# Copy the example configuration
cp .env.example .env

# Edit with your favorite editor
nano .env
# or
vim .env
# or
code .env
```

Fill in all the required fields:

```bash
# Telegram credentials from Step 1
TG_API_ID=12345678
TG_API_HASH=abcdef1234567890abcdef1234567890

# Anthropic credentials from Step 2
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxx

# Agent ID from Step 3
CMA_AGENT_ID=agent_01PokRXVsswBTo8pBr2Scd1U

# Environment ID (leave empty for now)
CMA_ENVIRONMENT_ID=

# Configure which chats to summarize
CHATS=GO-DE-an,Alert DE Pipeline,Multidim inhouse

# How many days to look back by default
DEFAULT_DAYS=7
```

### Chat Names

List your Telegram chats exactly as they appear in your chat list:
- Use commas to separate multiple chats
- Names are case-insensitive
- Spaces are allowed
- No quotes needed

Example:
```bash
CHATS=GO-DE-an,Alert DE Pipeline,Multidim inhouse
```

## Step 6: First Run

Run the script for the first time:

```bash
python3 summarize.py
```

### Phone Number Verification

You'll be prompted:
```
Please enter your phone (or bot token):
```

Enter your phone number with country code (e.g., `+6281234567890`)

### Verification Code

Telegram will send a code to your Telegram app (or SMS). You'll be prompted:
```
Please enter the code you received:
```

Enter the code (e.g., `12345`)

### Two-Factor Authentication (if enabled)

If you have 2FA enabled on Telegram, you'll be prompted:
```
Please enter your password:
```

Enter your Telegram 2FA password.

### Session Created

After successful login, a session file is created:
```
✅ Logged in as YourName (+6281234567890)
```

The session is saved to `multidim_summary.session` and you won't need to login again.

## Step 7: First Summary

On first run, the script will also:

1. **Fetch messages** from your configured chats
2. **Create a Claude environment** (prints the ID)
3. **Generate summaries**
4. **Save to** `summaries/` folder
5. **Send to** your Telegram Saved Messages

### Save the Environment ID

After the first run, you'll see:
```
Created environment: env_01AbCdEfGh
Add this to your .env to reuse it:
  CMA_ENVIRONMENT_ID=env_01AbCdEfGh
```

**Important**: Copy this ID and add it to your `.env`:
```bash
CMA_ENVIRONMENT_ID=env_01AbCdEfGh
```

This prevents creating new environments on every run.

## Verification

Check that everything works:

### ✅ Local Files
```bash
ls -l summaries/
# Should show .md files with today's date
```

### ✅ Telegram
Open your Telegram app and check **Saved Messages**. You should see the summaries.

## Troubleshooting

### "Invalid phone number"
- Include country code (e.g., `+1` for US, `+62` for Indonesia)
- Don't include spaces or dashes
- Format: `+6281234567890`

### "Invalid code"
- Make sure you're entering the code from the correct account
- Code expires after a few minutes - request a new one if needed
- Check both the Telegram app and SMS

### "TG_API_ID must be set"
- Make sure you saved your `.env` file
- Check that there are no typos
- Verify the file is in the correct directory

### "Could not find chat"
- Open Telegram and check the exact chat name
- Copy-paste the name into `.env` to avoid typos
- Names must match exactly (but case doesn't matter)

### Permission Error
If you see permission denied for `summarize.py`:
```bash
chmod +x summarize.py
```

## Next Steps

Now that setup is complete:
- Read [USAGE.md](USAGE.md) for detailed usage instructions
- Run `python3 summarize.py --days 7` to test with 7 days
- Schedule weekly runs (see USAGE.md for automation)

## Security Best Practices

1. **Never commit `.env`** - Already in `.gitignore`
2. **Keep session file private** - Equivalent to your Telegram login
3. **Rotate API keys** regularly if sharing code
4. **Use environment-specific** `.env` files for different machines

## Getting Help

If you're still stuck:
1. Check the error message carefully
2. Review this guide step-by-step
3. Check that all credentials are correct
4. Try deleting the session file and logging in again:
   ```bash
   rm multidim_summary.session*
   python3 summarize.py
   ```
