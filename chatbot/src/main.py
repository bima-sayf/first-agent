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
    
    # Validate TG_API_ID
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
    
    # Validate TG_API_HASH
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
        print("📋 SETUP INSTRUCTIONS")
        print("=" * 70)
        print("""
1. Copy the example environment file:
   cp .env.example .env

2. Get your Telegram API credentials:
   - Visit https://my.telegram.org
   - Go to 'API development tools'
   - Create an application to get your API ID and API Hash

3. Edit .env and fill in your credentials:
   TG_API_ID=your_numeric_api_id
   TG_API_HASH=your_32_character_hash

4. Restart the bot:
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

# Load configuration (but don't initialize Telethon client yet)
API_ID = int(os.environ["TG_API_ID"])
API_HASH = os.environ["TG_API_HASH"]

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

# Prefix used to mark the bot's own replies, so it never replies to itself
BOT_PREFIX = "\U0001F916 "  # robot emoji + space

SYSTEM_PROMPT = (
    "You are a helpful, concise assistant chatting with users in Telegram."
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
    print("🤖 HERMES TELEGRAM BOT")
    print("=" * 70)
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
    
    # Initialize Telegram client INSIDE the async function to use the correct event loop
    print("\n🔐 Connecting to Telegram...")
    client = TelegramClient("session/hermes_userbot", API_ID, API_HASH)
    
    # Register event handler for allowed chats
    @client.on(events.NewMessage(chats=ALLOWED_CHATS))
    async def on_message(event):
        """Handle new messages in allowed chats."""
        text = event.raw_text
        if not text or text.startswith(BOT_PREFIX):
            return  # ignore empty messages and the bot's own replies

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

        await event.respond(BOT_PREFIX + reply)
    
    # Start the client
    try:
        await client.start()
        print("✅ Connected to Telegram")
        print("\n💬 Listening for messages in configured chats...")
        print("   Send a message to chat with Hermes!")
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
