#!/usr/bin/env python3
"""
Check bot permissions and group access.
"""
import asyncio
import os
from dotenv import load_dotenv
from telethon import TelegramClient

load_dotenv()

API_ID = int(os.environ["TG_API_ID"])
API_HASH = os.environ["TG_API_HASH"]
BOT_TOKEN = os.environ["BOT_TOKEN"]
ALLOWED_CHATS_STR = os.getenv("ALLOWED_CHATS", "-5556749038")
ALLOWED_CHATS = [int(c.strip()) for c in ALLOWED_CHATS_STR.split(",")]

async def main():
    print("=" * 70)
    print("🔍 BOT PERMISSIONS CHECK")
    print("=" * 70)
    
    client = TelegramClient("session/reysa_bot", API_ID, API_HASH)
    
    try:
        await client.start(bot_token=BOT_TOKEN)
        me = await client.get_me()
        
        print(f"\n✅ Connected as: @{me.username}")
        print(f"   Bot ID: {me.id}")
        print(f"   Bot name: {me.first_name}")
        
        for chat_id in ALLOWED_CHATS:
            print(f"\n🔍 Checking chat: {chat_id}")
            try:
                chat = await client.get_entity(chat_id)
                print(f"   ✅ Chat found: {chat.title if hasattr(chat, 'title') else 'Private'}")
                
                # Check if bot is a member
                try:
                    participants = await client.get_participants(chat, limit=1000)
                    bot_is_member = any(p.id == me.id for p in participants)
                    
                    if bot_is_member:
                        print(f"   ✅ Bot IS a member of this chat")
                        
                        # Check bot permissions
                        me_participant = await client.get_permissions(chat, me.id)
                        print(f"   📋 Bot permissions:")
                        print(f"      - Can send messages: {not me_participant.is_banned}")
                        print(f"      - Is admin: {me_participant.is_admin}")
                        if hasattr(me_participant, 'banned_rights') and me_participant.banned_rights:
                            print(f"      ⚠️  Has restrictions: {me_participant.banned_rights}")
                    else:
                        print(f"   ❌ Bot is NOT a member of this chat!")
                        print(f"      Please add @{me.username} to the group")
                        
                except Exception as e:
                    print(f"   ⚠️  Could not check membership: {e}")
                    
            except Exception as e:
                print(f"   ❌ Error accessing chat: {e}")
        
        print("\n" + "=" * 70)
        print("💡 RECOMMENDATIONS")
        print("=" * 70)
        print(f"""
1. Make sure bot is added to the group
2. Bot needs permission to:
   - Read messages (Privacy Mode OFF in @BotFather)
   - Send messages
3. In group, type: @{me.username} hello
4. Check bot logs for debug output
""")
        
    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
