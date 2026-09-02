#!/usr/bin/env python3
"""
Helper script to get chat IDs for groups you're a member of.
Run this to find the chat ID of your "First-Agent" group.
"""
import asyncio
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
from telethon import TelegramClient

load_dotenv()

API_ID = int(os.environ["TG_API_ID"])
API_HASH = os.environ["TG_API_HASH"]


async def list_chats():
    """List all chats with their IDs."""
    print("=" * 70)
    print("📋 TELEGRAM CHAT ID FINDER")
    print("=" * 70)
    print("\nConnecting to Telegram...\n")
    
    client = TelegramClient("session/hermes_userbot", API_ID, API_HASH)
    
    try:
        await client.start()
        print("✅ Connected!\n")
        print("Your chats:\n")
        print(f"{'Chat ID':<20} {'Type':<15} {'Name'}")
        print("-" * 70)
        
        # Get all dialogs (chats)
        async for dialog in client.iter_dialogs():
            chat_id = dialog.id
            
            # Determine chat type
            if dialog.is_user:
                chat_type = "User/PM"
            elif dialog.is_group:
                chat_type = "Group"
            elif dialog.is_channel:
                chat_type = "Channel"
            else:
                chat_type = "Unknown"
            
            # Get chat name
            name = dialog.name or "Unnamed"
            
            # Highlight if this is "First-Agent"
            if "first-agent" in name.lower() or "firstagent" in name.lower():
                print(f"{chat_id:<20} {chat_type:<15} {name} 👈 FOUND!")
            else:
                print(f"{chat_id:<20} {chat_type:<15} {name}")
        
        print("\n" + "=" * 70)
        print("\n💡 To use a chat, copy its Chat ID and add to .env:")
        print("   ALLOWED_CHATS=-1001234567890")
        print("\n   For 'Saved Messages', use: ALLOWED_CHATS=me")
        print("\n   For multiple chats, separate with commas:")
        print("   ALLOWED_CHATS=me,-1001234567890")
        print("=" * 70 + "\n")
        
    finally:
        if client.is_connected():
            await client.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(list_chats())
    except KeyboardInterrupt:
        print("\n\n👋 Cancelled")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
