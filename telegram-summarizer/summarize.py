#!/usr/bin/env python3
"""
Telegram Chat Summarizer - One-shot execution

Fetches messages from specified Telegram chats over the last N days,
sends them to your Claude managed agent for categorization and summarization,
then saves the results locally and sends to your Telegram Saved Messages.

Usage:
    python3 summarize.py                    # Uses DEFAULT_DAYS from .env
    python3 summarize.py --days 7           # Last 7 days
    python3 summarize.py --days 14          # Last 14 days
    python3 summarize.py --force            # Force re-summarize even if already done

Configuration:
    Edit .env file to set:
    - Telegram API credentials
    - Anthropic API key and agent ID
    - List of chats to summarize
    - Default days lookback

First run:
    You'll be prompted for your phone number and a Telegram login code.
    After that, a session file is saved so you won't need to login again.
"""

import os
import sys
import asyncio
import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
from anthropic import Anthropic
from telethon import TelegramClient

# Load environment variables
load_dotenv()

# Configuration from .env
API_ID = int(os.environ.get("TG_API_ID", "0"))
API_HASH = os.environ.get("TG_API_HASH", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
AGENT_ID = os.environ.get("CMA_AGENT_ID", "")
ENVIRONMENT_ID = os.environ.get("CMA_ENVIRONMENT_ID")
CHATS = [c.strip() for c in os.environ.get("CHATS", "").split(",") if c.strip()]
DEFAULT_DAYS = int(os.environ.get("DEFAULT_DAYS", "7"))

# State file for tracking last summary
STATE_FILE = Path(".last_summary")

# Validate required configuration
if not API_ID or not API_HASH:
    print("❌ Error: TG_API_ID and TG_API_HASH must be set in .env")
    print("   Get these from https://my.telegram.org/apps")
    sys.exit(1)

if not ANTHROPIC_API_KEY:
    print("❌ Error: ANTHROPIC_API_KEY must be set in .env")
    print("   Get this from https://console.anthropic.com/")
    sys.exit(1)

if not AGENT_ID:
    print("❌ Error: CMA_AGENT_ID must be set in .env")
    sys.exit(1)

if not CHATS:
    print("❌ Error: CHATS must be set in .env")
    print("   Example: CHATS=GO-DE-an,Alert DE Pipeline")
    sys.exit(1)

# Initialize Anthropic client
anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)


def load_last_summary_state() -> dict[str, datetime]:
    """Load the last summary timestamps from state file."""
    state = {}
    if STATE_FILE.exists():
        for line in STATE_FILE.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            try:
                chat_name, timestamp_str = line.split("=", 1)
                state[chat_name] = datetime.fromisoformat(timestamp_str)
            except (ValueError, IndexError):
                continue
    return state


def save_last_summary_state(state: dict[str, datetime]):
    """Save the last summary timestamps to state file."""
    lines = ["# Last summary timestamps for each chat"]
    lines.append("# Format: chat_name=timestamp")
    lines.append("# This file is auto-managed by summarize.py")
    lines.append("")
    for chat_name, timestamp in sorted(state.items()):
        lines.append(f"{chat_name}={timestamp.isoformat()}")
    STATE_FILE.write_text("\n".join(lines) + "\n")


async def resolve_chat(client: TelegramClient, chat: str):
    """
    Resolve a chat by title, @username, or numeric ID.
    Returns the entity Telethon needs to fetch messages.
    """
    # Try numeric ID first
    try:
        return await client.get_entity(int(chat))
    except (ValueError, TypeError):
        pass

    # Try @username or special case like "me"
    try:
        return await client.get_entity(chat)
    except (ValueError, TypeError):
        pass

    # Fall back to matching display title
    async for dialog in client.iter_dialogs():
        if dialog.name.strip().lower() == str(chat).strip().lower():
            return dialog.entity

    raise ValueError(
        f'❌ Could not find chat "{chat}". '
        f"Check the exact name in your Telegram chat list."
    )


async def fetch_messages_since(
    client: TelegramClient, chat: str, cutoff: datetime
) -> list[tuple[datetime, str]]:
    """
    Fetch messages from a chat since the cutoff time.
    Returns list of (timestamp, message_text) tuples.
    """
    entity = await resolve_chat(client, chat)
    
    messages = []
    async for message in client.iter_messages(entity):
        # message.date is timezone-aware (UTC)
        if message.date < cutoff:
            break
        if message.text:
            messages.append((message.date, message.text))
    
    messages.reverse()  # Oldest first
    return messages


def get_or_create_environment() -> str:
    """
    Get the environment ID from .env or create a new one.
    Prints the ID if newly created so you can save it to .env.
    """
    global ENVIRONMENT_ID
    if ENVIRONMENT_ID:
        return ENVIRONMENT_ID

    print("\n📦 Creating new Claude environment...")
    env = anthropic_client.beta.environments.create(
        name="telegram-summarizer-env",
        config={"type": "cloud"},
    )
    print(f"✅ Created environment: {env.id}")
    print(f"💡 Add this to your .env to reuse it:")
    print(f"   CMA_ENVIRONMENT_ID={env.id}\n")
    
    ENVIRONMENT_ID = env.id
    return env.id


def summarize_all_chats_with_agent(chat_messages: list[tuple[str, list[tuple[datetime, str]], int]]) -> dict[str, str]:
    """
    Send all chats' messages to the Claude managed agent in one batch for summarization.
    
    Args:
        chat_messages: List of (chat_name, messages, days) tuples
    
    Returns:
        Dictionary mapping chat_name to summary text
    """
    environment_id = get_or_create_environment()
    
    # Build combined prompt for all chats
    all_chats_text = []
    for chat_name, messages, days in chat_messages:
        # Format messages with timestamps
        formatted_messages = [
            f"[{ts.strftime('%Y-%m-%d %H:%M')}] {text}"
            for ts, text in messages
        ]
        joined = "\n".join(formatted_messages)
        
        all_chats_text.append(
            f"## Chat: {chat_name}\n"
            f"Period: Last {days} days ({len(messages)} messages)\n\n"
            f"{joined}\n"
        )
    
    combined_text = "\n---\n\n".join(all_chats_text)
    total_messages = sum(len(messages) for _, messages, _ in chat_messages)
    
    print(f"   🤖 Sending {total_messages} messages from {len(chat_messages)} chats to agent...")
    
    session = anthropic_client.beta.sessions.create(
        agent=AGENT_ID,
        environment_id=environment_id,
        title=f"Telegram Summary: {len(chat_messages)} chats",
    )

    prompt = (
        f"Here are text messages from {len(chat_messages)} different Telegram chats. "
        f"Each chat is separated by '---' and labeled with its name.\n\n"
        f"For EACH chat, please provide a separate categorized summary. "
        f"Use icons (like 📌 🔔 ✅ 💡 ⚠️) instead of dashes for bullet points. "
        f"Keep each summary clean and scannable.\n\n"
        f"Format your response like this:\n"
        f"# Chat Name 1\n[summary]\n\n"
        f"# Chat Name 2\n[summary]\n\n"
        f"And so on for each chat.\n\n"
        f"{combined_text}"
    )

    final_text = []
    with anthropic_client.beta.sessions.events.stream(session.id) as stream:
        anthropic_client.beta.sessions.events.send(
            session.id,
            events=[{
                "type": "user.message",
                "content": [{"type": "text", "text": prompt}]
            }],
        )
        for event in stream:
            if event.type == "agent.message":
                for block in event.content:
                    if block.type == "text":
                        final_text.append(block.text)
            elif event.type == "session.status_idle":
                break

    full_response = "".join(final_text)
    
    # Parse the response to extract individual chat summaries
    summaries = {}
    current_chat = None
    current_lines = []
    
    for line in full_response.split('\n'):
        # Check if this is a chat header
        if line.startswith('# '):
            # Save previous chat if exists
            if current_chat and current_lines:
                summaries[current_chat] = '\n'.join(current_lines).strip()
            
            # Start new chat
            current_chat = line[2:].strip()
            current_lines = []
        else:
            if current_chat:
                current_lines.append(line)
    
    # Don't forget the last chat
    if current_chat and current_lines:
        summaries[current_chat] = '\n'.join(current_lines).strip()
    
    return summaries


def save_summary_to_file(chat_name: str, summary: str, days: int) -> Path:
    """
    Save the summary to a markdown file with timestamp.
    Returns the file path.
    """
    # Create summaries directory if it doesn't exist
    summaries_dir = Path("summaries")
    summaries_dir.mkdir(exist_ok=True)
    
    # Generate filename with timestamp and chat name
    timestamp = datetime.now().strftime("%Y-%m-%d")
    safe_chat_name = "".join(c if c.isalnum() else "_" for c in chat_name)
    filename = f"{timestamp}_{safe_chat_name}.md"
    filepath = summaries_dir / filename
    
    # Create markdown content with proper structure
    content = f"""# {chat_name} - Summary

**Period:** Last {days} days  
**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

---

{summary}

---

*Generated by Telegram Summarizer using Claude Agent*
"""
    
    filepath.write_text(content, encoding="utf-8")
    return filepath


async def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description="Summarize Telegram chats from the last N days"
    )
    parser.add_argument(
        "--days",
        type=int,
        default=DEFAULT_DAYS,
        help=f"Number of days to look back (default: {DEFAULT_DAYS})",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-summarize even if already done recently",
    )
    args = parser.parse_args()

    print("="*60)
    print("📱 Telegram Chat Summarizer")
    print("="*60)
    print(f"📅 Looking back: {args.days} days")
    print(f"💬 Chats to summarize: {len(CHATS)}")
    for i, chat in enumerate(CHATS, 1):
        print(f"   {i}. {chat}")
    print("="*60)
    print()

    # Load state
    state = load_last_summary_state()
    if not args.force and state:
        print("📝 State loaded - will skip already summarized periods")
        print()

    # Connect to Telegram
    async with TelegramClient("summarizer", API_ID, API_HASH) as client:
        print("🔐 Logging in to Telegram...")
        me = await client.get_me()
        print(f"✅ Logged in as {me.first_name} ({me.phone})")
        print()

        # Collect all chats that need summarization
        chats_to_summarize = []
        
        for i, chat in enumerate(CHATS, 1):
            print(f"[{i}/{len(CHATS)}] Checking: {chat}")
            
            try:
                # Determine cutoff time
                if args.force:
                    # Force mode: use specified days
                    cutoff = datetime.now(timezone.utc) - timedelta(days=args.days)
                    print(f"   🔄 Force mode: fetching last {args.days} days")
                elif chat in state:
                    # Use last summary time as cutoff
                    last_summary = state[chat]
                    now = datetime.now(timezone.utc)
                    time_diff = now - last_summary
                    days_since = time_diff.days
                    
                    if days_since < 1:
                        print(f"   ⏭️  Already summarized today, skipping")
                        continue
                    
                    cutoff = last_summary
                    print(f"   📅 Fetching new messages since last summary ({days_since} days ago)")
                else:
                    # First time: use specified days
                    cutoff = datetime.now(timezone.utc) - timedelta(days=args.days)
                    print(f"   🆕 First time summary: fetching last {args.days} days")
                
                # Fetch messages
                print(f"   📥 Fetching messages...")
                messages = await fetch_messages_since(client, chat, cutoff)
                
                if not messages:
                    print(f"   ⚠️  No new messages found")
                    continue
                
                print(f"   ✅ Found {len(messages)} new messages")
                
                # Calculate actual time range
                oldest_msg = messages[0][0]
                newest_msg = messages[-1][0]
                actual_days = (newest_msg - oldest_msg).days + 1
                
                # Add to batch
                chats_to_summarize.append({
                    'name': chat,
                    'messages': messages,
                    'days': actual_days,
                    'newest_timestamp': newest_msg
                })
                print(f"   📦 Queued for summarization")
                print()
                
            except ValueError as e:
                print(f"   ❌ Error: {e}")
                print()
                continue
            except Exception as e:
                print(f"   ❌ Unexpected error: {e}")
                print()
                continue

        # Summarize all chats in one batch
        all_summaries = []
        if chats_to_summarize:
            print("="*60)
            print(f"🤖 Sending {len(chats_to_summarize)} chats to agent for batch summarization...")
            print("="*60)
            print()
            
            # Prepare batch data
            batch_data = [
                (chat['name'], chat['messages'], chat['days'])
                for chat in chats_to_summarize
            ]
            
            # Get all summaries in one call
            summaries = summarize_all_chats_with_agent(batch_data)
            
            print(f"✅ Received summaries for {len(summaries)} chats")
            print()
            
            # Process and save each summary
            for chat_info in chats_to_summarize:
                chat_name = chat_info['name']
                messages = chat_info['messages']
                actual_days = chat_info['days']
                newest_msg = chat_info['newest_timestamp']
                
                if chat_name not in summaries:
                    print(f"⚠️  Warning: No summary found for {chat_name}")
                    continue
                
                summary = summaries[chat_name]
                
                print(f"📝 Processing: {chat_name}")
                
                # Save to file
                filepath = save_summary_to_file(chat_name, summary, actual_days)
                print(f"   💾 Saved to: {filepath}")
                
                # Send to Telegram Saved Messages
                telegram_message = f"📊 **Summary: {chat_name}**\n\n{summary}"
                await client.send_message("me", telegram_message)
                print(f"   📤 Sent to Telegram Saved Messages")
                
                # Update state with the timestamp of the newest message
                state[chat_name] = newest_msg
                
                all_summaries.append((chat_name, summary, filepath))
                print(f"   ✅ Done!")
                print()
        
        else:
            print("⏭️  No chats need summarization")
            print()

        # Save state
        if state:
            save_last_summary_state(state)
            print("💾 State saved")
            print()

        # Final summary
        print("="*60)
        print("✨ Summary Complete!")
        print("="*60)
        print(f"✅ Processed: {len(all_summaries)}/{len(CHATS)} chats")
        if len(all_summaries) < len(CHATS):
            skipped = len(CHATS) - len(all_summaries)
            print(f"⏭️  Skipped: {skipped} (already up to date)")
        print(f"📂 Summaries saved to: summaries/")
        print(f"📱 Summaries sent to Telegram Saved Messages")
        print()
        
        if all_summaries:
            print("Generated files:")
            for chat, _, filepath in all_summaries:
                print(f"  • {filepath}")
        print()
        print("💡 Tip: Run without --force to only summarize new messages since last run")
        print("="*60)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
