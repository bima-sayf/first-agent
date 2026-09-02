#!/usr/bin/env python3
"""
Fetch and display Claude Managed Agent session statistics.

This script retrieves all sessions for your configured agent and displays:
- Session count
- Total costs
- Token usage
- Session details

Outputs:
- agent_stats.md - Human-readable markdown report
- agent_stats.json - Machine-readable JSON data
"""

import os
import json
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from anthropic import Anthropic

# Load environment variables
load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
AGENT_ID = os.getenv("CMA_AGENT_ID", "")

if not ANTHROPIC_API_KEY:
    print("❌ Error: ANTHROPIC_API_KEY must be set in .env")
    exit(1)

if not AGENT_ID:
    print("❌ Error: CMA_AGENT_ID must be set in .env")
    exit(1)

# Initialize Anthropic client
anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)


def format_timestamp(ts_str: str) -> str:
    """Format ISO timestamp to readable format."""
    try:
        dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d %H:%M:%S UTC')
    except:
        return ts_str


def format_cost(amount: float, currency: str = "USD") -> str:
    """Format cost with currency symbol."""
    if currency == "USD":
        return f"${amount:.4f}"
    return f"{amount:.4f} {currency}"


def main():
    print("🤖 Fetching Agent Session Statistics...")
    print(f"Agent ID: {AGENT_ID}")
    print()
    
    try:
        # Fetch all sessions
        print("📊 Retrieving sessions...")
        sessions_response = anthropic_client.beta.sessions.list(
            limit=100  # Adjust if you have more sessions
        )
        
        # Filter sessions by agent ID if needed
        all_sessions = sessions_response.data
        sessions = [s for s in all_sessions if getattr(s, 'agent', None) == AGENT_ID]
        
        print(f"✅ Found {len(sessions)} sessions for this agent (out of {len(all_sessions)} total)")
        print()
        
        # Collect statistics
        total_cost = 0.0
        total_input_tokens = 0
        total_output_tokens = 0
        session_details = []
        
        for session in sessions:
            session_data = {
                'id': session.id,
                'title': getattr(session, 'title', 'Untitled'),
                'created_at': getattr(session, 'created_at', 'Unknown'),
                'status': getattr(session, 'status', 'Unknown'),
            }
            
            # Try to get usage/cost information if available
            if hasattr(session, 'usage'):
                usage = session.usage
                session_data['input_tokens'] = getattr(usage, 'input_tokens', 0)
                session_data['output_tokens'] = getattr(usage, 'output_tokens', 0)
                total_input_tokens += session_data['input_tokens']
                total_output_tokens += session_data['output_tokens']
            
            if hasattr(session, 'cost'):
                cost = session.cost
                session_data['cost'] = getattr(cost, 'amount', 0.0)
                session_data['currency'] = getattr(cost, 'currency', 'USD')
                total_cost += session_data['cost']
            
            session_details.append(session_data)
        
        # Sort sessions by creation time (newest first)
        session_details.sort(
            key=lambda x: x.get('created_at', ''),
            reverse=True
        )
        
        # Prepare statistics
        stats = {
            'agent_id': AGENT_ID,
            'generated_at': datetime.now().isoformat(),
            'summary': {
                'total_sessions': len(sessions),
                'total_cost': total_cost,
                'total_input_tokens': total_input_tokens,
                'total_output_tokens': total_output_tokens,
                'total_tokens': total_input_tokens + total_output_tokens,
            },
            'sessions': session_details
        }
        
        # Generate JSON report
        json_path = Path("agent_stats.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
        print(f"💾 Saved JSON report: {json_path}")
        
        # Generate Markdown report
        md_lines = [
            "# Claude Managed Agent - Session Statistics",
            "",
            f"**Agent ID:** `{AGENT_ID}`  ",
            f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "---",
            "",
            "## Summary",
            "",
            f"- **Total Sessions:** {len(sessions)}",
            f"- **Total Cost:** {format_cost(total_cost)}",
            f"- **Total Input Tokens:** {total_input_tokens:,}",
            f"- **Total Output Tokens:** {total_output_tokens:,}",
            f"- **Total Tokens:** {total_input_tokens + total_output_tokens:,}",
            "",
            "---",
            "",
            "## Sessions",
            "",
        ]
        
        if not session_details:
            md_lines.append("*No sessions found.*")
        else:
            for i, session in enumerate(session_details, 1):
                md_lines.append(f"### {i}. {session.get('title', 'Untitled')}")
                md_lines.append("")
                md_lines.append(f"- **Session ID:** `{session['id']}`")
                md_lines.append(f"- **Created:** {format_timestamp(session.get('created_at', 'Unknown'))}")
                md_lines.append(f"- **Status:** {session.get('status', 'Unknown')}")
                
                if 'input_tokens' in session:
                    md_lines.append(f"- **Input Tokens:** {session['input_tokens']:,}")
                if 'output_tokens' in session:
                    md_lines.append(f"- **Output Tokens:** {session['output_tokens']:,}")
                if 'cost' in session:
                    md_lines.append(f"- **Cost:** {format_cost(session['cost'], session.get('currency', 'USD'))}")
                
                md_lines.append("")
        
        md_lines.extend([
            "---",
            "",
            "*Generated by `agent_stats.py`*",
        ])
        
        md_path = Path("agent_stats.md")
        md_path.write_text('\n'.join(md_lines), encoding='utf-8')
        print(f"📄 Saved Markdown report: {md_path}")
        
        # Display summary
        print()
        print("="*60)
        print("📊 Summary")
        print("="*60)
        print(f"Total Sessions: {len(sessions)}")
        print(f"Total Cost: {format_cost(total_cost)}")
        print(f"Total Tokens: {total_input_tokens + total_output_tokens:,}")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)


if __name__ == "__main__":
    main()
