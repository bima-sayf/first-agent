import asyncio
import os
import sys
from urllib.parse import urlparse

import httpx
from dotenv import load_dotenv
from telethon import TelegramClient, events

load_dotenv()


def validate_environment() -> None:
    """Validate required environment variables and configuration on startup."""
    errors = []
    
    # Check for bot token (bot account mode)
    bot_token = os.getenv("BOT_TOKEN")
    
    if not bot_token:
        errors.append("❌ BOT_TOKEN is not set")
    elif ":" not in bot_token:
        errors.append(f"❌ BOT_TOKEN format invalid (should be 'id:hash', got: '{bot_token[:20]}...')")
    
    # Still need API_ID and API_HASH for bot mode
    api_id_str = os.getenv("TG_API_ID")
    if not api_id_str:
        errors.append("❌ TG_API_ID is not set")
    else:
        try:
            api_id = int(api_id_str)
            if api_id <= 0:
                errors.append(f"❌ TG_API_ID must be a positive integer (got: {api_id})")
        except ValueError:
            errors.append(f"❌ TG_API_ID must be a valid integer (got: '{api_id_str}')")
    
    api_hash = os.getenv("TG_API_HASH")
    if not api_hash:
        errors.append("❌ TG_API_HASH is not set")
    elif len(api_hash) < 32:
        errors.append(f"❌ TG_API_HASH seems too short (expected 32+ chars, got {len(api_hash)})")
    
    # Validate OLLAMA_URL format
    ollama_url = os.getenv("OLLAMA_URL", "http://ollama:11434/api/chat")
    try:
        parsed = urlparse(ollama_url)
        if not parsed.scheme or not parsed.netloc:
            errors.append(f"❌ OLLAMA_URL is not a valid URL (got: '{ollama_url}')")
    except Exception:
        errors.append(f"❌ OLLAMA_URL is malformed (got: '{ollama_url}')")
    
    # If there are errors, print them and exit
    if errors:
        print("=" * 70)
        print("🚨 CONFIGURATION ERROR")
        print("=" * 70)
        print("\nThe following configuration issues were found:\n")
        for error in errors:
            print(f"  {error}")
        print("\n" + "=" * 70)
        print("📋 SETUP INSTRUCTIONS - BOT ACCOUNT MODE")
        print("=" * 70)
        print("""
1. Get bot token from @BotFather on Telegram
2. Get API credentials from https://my.telegram.org

3. Edit .env and fill in:
   BOT_TOKEN=your_bot_token_from_botfather
   TG_API_ID=your_numeric_api_id
   TG_API_HASH=your_32_character_hash
   ALLOWED_CHATS=-5556749038

4. Add bot to group and restart:
   docker compose up
""")
        print("=" * 70)
        sys.exit(1)


async def check_ollama_connectivity(url: str, timeout: int = 5) -> bool:
    """Check if Ollama service is reachable."""
    try:
        # Extract base URL from the full API endpoint
        parsed = urlparse(url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(f"{base_url}/api/tags")
            return response.status_code == 200
    except Exception:
        return False


# Validate environment before loading configuration
validate_environment()

# Load configuration
API_ID = int(os.environ["TG_API_ID"])
API_HASH = os.environ["TG_API_HASH"]
BOT_TOKEN = os.environ["BOT_TOKEN"]  # Bot token from @BotFather

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434/api/chat")
MODEL = os.getenv("OLLAMA_MODEL", "hermes3")

# Parse allowed chats from environment
# Format: "me" for Saved Messages, or comma-separated chat IDs
# Example: ALLOWED_CHATS=me,-1001234567890
ALLOWED_CHATS_STR = os.getenv("ALLOWED_CHATS", "me")
ALLOWED_CHATS = []
for chat in ALLOWED_CHATS_STR.split(","):
    chat = chat.strip()
    if chat == "me":
        ALLOWED_CHATS.append("me")
    else:
        try:
            ALLOWED_CHATS.append(int(chat))
        except ValueError:
            print(f"⚠️  Warning: Invalid chat ID '{chat}' in ALLOWED_CHATS, skipping")

if not ALLOWED_CHATS:
    print("❌ Error: No valid chats in ALLOWED_CHATS")
    sys.exit(1)

# Bot account mode - no prefix needed (bot name is clear)
BOT_PREFIX = ""  # Bot identity is clear from username

SYSTEM_PROMPT = (
    "You are Reysa, a helpful and concise AI assistant chatting with users in Telegram. "
    "Keep responses clear, friendly, and to the point."
)

MAX_HISTORY_MESSAGES = 20  # keep the last N turns so replies stay on-topic

# Ensure session directory exists
os.makedirs("session", exist_ok=True)

# Per-chat conversation history (dict with chat_id as key)
chat_histories: dict = {}


def get_chat_history(chat_id) -> list[dict]:
    """Get or create conversation history for a specific chat."""
    if chat_id not in chat_histories:
        chat_histories[chat_id] = []
    return chat_histories[chat_id]


async def ask_hermes(user_text: str, history: list[dict]) -> str:
    """Send a message to the Hermes model and get a response."""
    history.append({"role": "user", "content": user_text})
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history[-MAX_HISTORY_MESSAGES:]

    async with httpx.AsyncClient(timeout=120) as http:
        resp = await http.post(
            OLLAMA_URL,
            json={"model": MODEL, "messages": messages, "stream": False},
        )
        resp.raise_for_status()
        data = resp.json()

    reply = data["message"]["content"].strip()
    history.append({"role": "assistant", "content": reply})
    return reply


async def main():
    """Main bot entry point."""
    print("=" * 70)
    print("🤖 REYSA BOT (Bot Account Mode)")
    print("=" * 70)
    print(f"Bot: @reysablue_bot")
    print(f"Model: {MODEL}")
    print(f"Ollama URL: {OLLAMA_URL}")
    print(f"Max history: {MAX_HISTORY_MESSAGES} messages")
    print(f"Allowed chats: {', '.join(str(c) for c in ALLOWED_CHATS)}")
    print("=" * 70)
    
    # Check Ollama connectivity before starting
    print("\n🔍 Checking Ollama service...")
    if await check_ollama_connectivity(OLLAMA_URL):
        print("✅ Ollama is reachable")
    else:
        print("⚠️  Warning: Cannot reach Ollama at", OLLAMA_URL)
        print("   The bot will start, but responses will fail until Ollama is available.")
        print("   Check with: docker compose ps")
    
    # Initialize Telegram bot client
    print("\n🔐 Connecting to Telegram as bot...")
    client = TelegramClient("session/reysa_bot", API_ID, API_HASH)
    
    # Get bot info for mention detection
    bot_username = None
    
    # Register event handler for allowed chats
    @client.on(events.NewMessage(incoming=True, chats=ALLOWED_CHATS))
    async def on_message(event):
        """Handle new messages in allowed chats."""
        nonlocal bot_username
        
        text = event.raw_text
        if not text:
            return  # ignore empty messages
        
        # Debug: Print received message info
        print(f"\n📨 Received message in chat {event.chat_id}")
        print(f"   Text: {text[:100]}")
        print(f"   From: {event.sender_id}")
        
        # Check if this is the bot's own message (don't respond to self)
        me = await client.get_me()
        my_id = me.id
        
        if event.sender_id == my_id:
            print(f"   ⏭️  Ignoring - this is my own message")
            return  # Don't respond to own messages
        
        print(f"   ✅ Processing message...")
        
        # Remove bot mention from text if present (optional cleanup)
        if bot_username:
            text = text.replace(f"@{bot_username}", "").strip()
            text = text.replace(bot_username, "").strip()
        
        if not text:
            print(f"   ⚠️  Text empty after cleanup")
            return

        # Get chat-specific history
        chat_id = event.chat_id
        history = get_chat_history(chat_id)

        async with client.action(event.chat_id, "typing"):
            try:
                reply = await ask_hermes(text, history)
            except httpx.ConnectError:
                reply = "Can't reach Ollama — is the `ollama` container running? Try `docker compose up -d`."
            except httpx.HTTPStatusError as exc:
                reply = f"Ollama error (HTTP {exc.response.status_code}): {exc.response.text[:200]}"
            except Exception as exc:
                reply = f"(error talking to Hermes: {exc})"

        print(f"   📤 Sending reply: {reply[:100]}...")
        await event.respond(reply)
    
    # Start the client as bot
    try:
        await client.start(bot_token=BOT_TOKEN)
        me = await client.get_me()
        bot_username = me.username
        print(f"✅ Connected as bot: @{bot_username}")
        print(f"   Bot name: {me.first_name}")
        print("\n💬 Listening for ALL messages in configured chats...")
        print(f"   ⚠️  Make sure Privacy Mode is OFF in @BotFather")
        print(f"   Bot will respond to every message in the chat")
        if len(ALLOWED_CHATS) == 1:
            print(f"   Active chat: {ALLOWED_CHATS[0]}")
        else:
            print(f"   Active chats: {len(ALLOWED_CHATS)}")
        print("=" * 70 + "\n")
        
        # Run until disconnected
        await client.run_until_disconnected()
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down gracefully...")
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        raise
    finally:
        if client.is_connected():
            await client.disconnect()
            print("✅ Disconnected from Telegram")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
