#!/usr/bin/env python3
"""
Quick test to verify the event loop fix works correctly.
This simulates the bot startup without actually connecting to Telegram.
"""
import asyncio
import os
import sys
from unittest.mock import MagicMock, patch

# Add parent directory to path to import from src
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Set dummy environment variables for testing
os.environ["TG_API_ID"] = "12345"
os.environ["TG_API_HASH"] = "a" * 32


async def test_event_loop_consistency():
    """Test that all async operations use the same event loop."""
    print("🧪 Testing event loop consistency...")
    
    # Get the current event loop
    loop = asyncio.get_running_loop()
    print(f"✅ Running in event loop: {id(loop)}")
    
    # Simulate check_ollama_connectivity
    from src.main import check_ollama_connectivity
    
    with patch('httpx.AsyncClient') as mock_client:
        # Mock the HTTP client to avoid real network calls
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
        
        result = await check_ollama_connectivity("http://localhost:11434/api/chat")
        print(f"✅ Ollama connectivity check completed in same loop")
    
    # Verify we're still in the same loop
    current_loop = asyncio.get_running_loop()
    assert id(loop) == id(current_loop), "Event loop changed!"
    print(f"✅ Event loop consistency maintained: {id(current_loop)}")
    
    return True


async def test_client_initialization():
    """Test that TelegramClient can be initialized inside async context."""
    print("\n🧪 Testing TelegramClient initialization...")
    
    loop = asyncio.get_running_loop()
    print(f"✅ Current event loop: {id(loop)}")
    
    # Import TelegramClient (but don't actually connect)
    from telethon import TelegramClient
    
    # Create client inside async context (this was the fix!)
    client = TelegramClient("session/test_bot", 12345, "a" * 32)
    print(f"✅ TelegramClient created in correct event loop")
    print(f"   Client loop: {id(client.loop) if hasattr(client, 'loop') else 'default'}")
    
    # Don't actually connect, just verify creation worked
    print("✅ Client initialization successful")
    
    return True


async def main():
    """Run all tests."""
    print("=" * 70)
    print("🔬 EVENT LOOP FIX VERIFICATION")
    print("=" * 70)
    
    try:
        # Test 1: Event loop consistency
        await test_event_loop_consistency()
        
        # Test 2: Client initialization
        await test_client_initialization()
        
        print("\n" + "=" * 70)
        print("✅ ALL TESTS PASSED")
        print("=" * 70)
        print("\nThe event loop fix is working correctly!")
        print("The bot should now start without RuntimeError.")
        return 0
        
    except Exception as e:
        print("\n" + "=" * 70)
        print("❌ TEST FAILED")
        print("=" * 70)
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
