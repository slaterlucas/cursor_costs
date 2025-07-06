#!/usr/bin/env python3
"""
Setup script for Cursor Monitor
Helps extract session token from cURL command and configure the monitor
"""

import json
import re
import sys
from pathlib import Path

def extract_session_token_from_curl(curl_command):
    """Extract WorkosCursorSessionToken from cURL command"""
    # Look for the cookie header with WorkosCursorSessionToken
    cookie_pattern = r"WorkosCursorSessionToken=([^;'\s]+)"
    match = re.search(cookie_pattern, curl_command)
    
    if match:
        return match.group(1)
    else:
        # Try to find it in -b flag
        cookie_flag_pattern = r"-b\s+['\"]([^'\"]*WorkosCursorSessionToken=([^;'\s]+)[^'\"]*)['\"]"
        match = re.search(cookie_flag_pattern, curl_command)
        if match:
            return match.group(2)
    
    return None

def setup_config():
    """Interactive setup for monitor configuration"""
    print("🔧 Cursor Monitor Setup")
    print("=" * 50)
    
    config_file = "cursor_monitor_config.json"
    
    # Check if config already exists
    if Path(config_file).exists():
        print(f"Config file {config_file} already exists.")
        overwrite = input("Do you want to overwrite it? (y/N): ").lower().strip()
        if overwrite != 'y':
            print("Setup cancelled.")
            return
    
    print("\n1. Session Token Setup")
    print("You can either:")
    print("  a) Paste your cURL command (from DevTools)")
    print("  b) Enter the session token directly")
    
    method = input("\nChoose method (a/b): ").lower().strip()
    
    session_token = ""
    
    if method == 'a':
        print("\nPaste your cURL command here (press Enter twice when done):")
        curl_lines = []
        while True:
            line = input()
            if line.strip() == "" and curl_lines:
                break
            curl_lines.append(line)
        
        curl_command = " ".join(curl_lines)
        session_token = extract_session_token_from_curl(curl_command)
        
        if not session_token:
            print("❌ Could not extract session token from cURL command")
            print("Please try method (b) instead")
            return
        else:
            print(f"✅ Extracted session token: {session_token[:20]}...")
    
    elif method == 'b':
        session_token = input("Enter your WorkosCursorSessionToken: ").strip()
        if not session_token:
            print("❌ Session token is required")
            return
    
    else:
        print("❌ Invalid choice")
        return
    
    print("\n2. Notification Settings")
    
    # Threshold
    threshold_input = input("Notification threshold in dollars (default: 0.50): ").strip()
    try:
        threshold_dollars = float(threshold_input) if threshold_input else 0.50
        threshold_cents = int(threshold_dollars * 100)
    except ValueError:
        threshold_cents = 50
    
    # Poll interval
    interval_input = input("Check interval in minutes (default: 5): ").strip()
    try:
        poll_interval = int(interval_input) if interval_input else 5
    except ValueError:
        poll_interval = 5
    
    # Notification methods
    print("\n3. Notification Methods")
    console = input("Enable console notifications? (Y/n): ").lower().strip()
    console = console != 'n'
    
    desktop = input("Enable desktop notifications? (y/N): ").lower().strip()
    desktop = desktop == 'y'
    
    webhook = input("Enable webhook notifications? (y/N): ").lower().strip()
    webhook = webhook == 'y'
    
    webhook_url = ""
    if webhook:
        webhook_url = input("Enter webhook URL (Slack/Discord/etc): ").strip()
    
    # Create config
    config = {
        "session_token": session_token,
        "notification_threshold_cents": threshold_cents,
        "poll_interval_minutes": poll_interval,
        "notification_methods": {
            "console": console,
            "desktop": desktop,
            "webhook": webhook,
            "webhook_url": webhook_url
        }
    }
    
    # Save config
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"\n✅ Configuration saved to {config_file}")
    print("\n4. Testing Connection")
    
    # Test the connection
    try:
        import requests
        from datetime import datetime
        
        headers = {
            'accept': '*/*',
            'content-type': 'application/json',
            'origin': 'https://cursor.com',
            'referer': 'https://cursor.com/dashboard?tab=usage',
        }
        
        cookies = {
            'WorkosCursorSessionToken': session_token
        }
        
        now = datetime.now()
        payload = {
            "month": now.month,
            "year": now.year,
            "includeUsageEvents": True
        }
        
        response = requests.post(
            'https://cursor.com/api/dashboard/get-monthly-invoice',
            headers=headers,
            cookies=cookies,
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('items'):
                total_cents = data['items'][0]['cents']
                print(f"✅ Connection successful! Current spending: ${total_cents/100:.2f}")
            else:
                print("✅ Connection successful! No usage data found.")
        else:
            print(f"❌ Connection failed: HTTP {response.status_code}")
            print("Your session token may be expired or invalid.")
            
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
    
    print("\n🚀 Setup complete!")
    print("To start monitoring, run:")
    print("  python cursor_monitor.py")
    print("\nTo run a single check:")
    print("  python cursor_monitor.py --once")

if __name__ == "__main__":
    setup_config() 