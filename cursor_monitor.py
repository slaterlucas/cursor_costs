#!/usr/bin/env python3
"""
Cursor Usage Monitor
Polls Cursor's billing API and notifies when spending increases
"""

import json
import time
import requests
from datetime import datetime, date
from pathlib import Path
import os
import sys

class CursorMonitor:
    def __init__(self, config_file="cursor_monitor_config.json"):
        self.config_file = config_file
        self.state_file = "cursor_monitor_state.json"
        self.config = self.load_config()
        self.state = self.load_state()
        
    def load_config(self):
        """Load configuration from file"""
        if not Path(self.config_file).exists():
            # Create default config
            default_config = {
                "session_token": "",
                "notification_threshold_cents": 50,  # Alert when spending increases by $0.50+
                "poll_interval_minutes": 5,
                "notification_methods": {
                    "console": True,
                    "desktop": False,  # Requires plyer: pip install plyer
                    "webhook": False,
                    "webhook_url": ""
                }
            }
            with open(self.config_file, 'w') as f:
                json.dump(default_config, f, indent=2)
            print(f"Created default config at {self.config_file}")
            print("Please update the session_token in the config file!")
            return default_config
        
        with open(self.config_file, 'r') as f:
            return json.load(f)
    
    def load_state(self):
        """Load previous state (last known spending)"""
        if Path(self.state_file).exists():
            with open(self.state_file, 'r') as f:
                return json.load(f)
        return {"last_total_cents": 0, "last_check": None}
    
    def save_state(self):
        """Save current state"""
        with open(self.state_file, 'w') as f:
            json.dump(self.state, f, indent=2)
    
    def get_current_usage(self):
        """Fetch current usage from Cursor API"""
        now = datetime.now()
        
        headers = {
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9',
            'content-type': 'application/json',
            'origin': 'https://cursor.com',
            'referer': 'https://cursor.com/dashboard?tab=usage',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
        }
        
        cookies = {
            'WorkosCursorSessionToken': self.config['session_token']
        }
        
        # Try current month first, then previous month if no data
        months_to_try = [
            (now.month, now.year),
            (now.month - 1 if now.month > 1 else 12, now.year if now.month > 1 else now.year - 1)
        ]
        
        for month, year in months_to_try:
            payload = {
                "month": month,
                "year": year,
                "includeUsageEvents": True
            }
            
            try:
                response = requests.post(
                    'https://cursor.com/api/dashboard/get-monthly-invoice',
                    headers=headers,
                    cookies=cookies,
                    json=payload,
                    timeout=30
                )
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        
                        # Check if this month has actual usage data
                        if data.get('items') or (data.get('usageEvents') and len(data['usageEvents']) > 0):
                            return data
                        else:
                            continue
                            
                    except json.JSONDecodeError as e:
                        raise Exception(f"Invalid JSON response: {e}")
                        
                elif response.status_code == 401:
                    raise Exception("Authentication failed - session token may be expired")
                else:
                    raise Exception(f"API request failed with status {response.status_code}")
                    
            except requests.RequestException as e:
                raise Exception(f"Network error: {e}")
        
        # If we get here, no months had usage data
        return {"items": [], "usageEvents": [], "pricingDescription": {}}
    
    def send_notification(self, message):
        """Send notification via configured methods"""
        # Console notification
        if self.config['notification_methods']['console']:
            print(f"🔔 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {message}")

        # Desktop (macOS) notification via pync
        if self.config['notification_methods']['desktop']:
            try:
                from pync import Notifier
                Notifier.notify(message, title="Cursor Usage Alert")
            except ImportError:
                print("⚠️  Desktop notifications require the 'pync' package. Install with: pip install pync")
            except Exception as e:
                print(f"⚠️  Desktop notification failed: {e}")
                print("   You can disable desktop notifications in your config file.")

        # Webhook notification
        if self.config['notification_methods']['webhook'] and self.config['notification_methods']['webhook_url']:
            try:
                webhook_payload = {
                    "text": f"Cursor Usage Alert: {message}",
                    "timestamp": datetime.now().isoformat()
                }
                requests.post(
                    self.config['notification_methods']['webhook_url'],
                    json=webhook_payload,
                    timeout=10
                )
            except Exception as e:
                print(f"⚠️  Webhook notification failed: {e}")
    
    def check_usage(self):
        """Check current usage and notify if spending increased"""
        try:
            usage_data = self.get_current_usage()
            
            # Try to get total spending from items first
            total_cents = 0
            if usage_data.get('items') and len(usage_data['items']) > 0:
                total_cents = usage_data['items'][0]['cents']
            
            # If no items, try to calculate from usage events
            elif usage_data.get('usageEvents') and len(usage_data['usageEvents']) > 0:
                total_cents = sum(event.get('priceCents', 0) for event in usage_data['usageEvents'])
            
            # If still no data, this might be the first run or no usage yet
            else:
                total_cents = 0
            
            current_cents = int(total_cents)  # Ensure it's an integer
            last_cents = self.state['last_total_cents']
            
            # Update state
            self.state['last_check'] = datetime.now().isoformat()
            
            # If this is the first run (last_cents is 0), just set the baseline
            if last_cents == 0 and current_cents > 0:
                self.state['last_total_cents'] = current_cents
                self.save_state()
                return
            
            if current_cents > last_cents:
                increase_cents = current_cents - last_cents
                increase_dollars = increase_cents / 100
                total_dollars = current_cents / 100
                
                # Check if increase meets notification threshold
                if increase_cents >= self.config['notification_threshold_cents']:
                    message = f"Spending increased by ${increase_dollars:.2f} (Total: ${total_dollars:.2f})"
                    self.send_notification(message)
                    
                    # Show recent usage events for context
                    if usage_data.get('usageEvents'):
                        recent_events = [e for e in usage_data['usageEvents'] if e.get('priceCents', 0) > 0][:3]
                        for event in recent_events:
                            event_time = datetime.fromtimestamp(int(event['timestamp']) / 1000)
                            event_cost = event['priceCents'] / 100
                            model = event.get('details', {}).get('toolCallComposer', {}).get('modelIntent', 'unknown')
                            print(f"  • {event_time.strftime('%H:%M:%S')} - ${event_cost:.3f} ({model})")
                else:
                    print(f"Spending increased by ${increase_dollars:.2f} (below threshold of ${self.config['notification_threshold_cents']/100:.2f})")
                
                # Always update the state when spending increases
                self.state['last_total_cents'] = current_cents
                self.save_state()
                
            elif current_cents == last_cents:
                print(f"No change in spending (${current_cents/100:.2f})")
            else:
                print(f"Spending decreased from ${last_cents/100:.2f} to ${current_cents/100:.2f} (possible new billing cycle)")
                self.state['last_total_cents'] = current_cents
                self.save_state()
                
        except Exception as e:
            print(f"Error checking usage: {e}")
            # Uncomment the line below for detailed debugging if needed
            # import traceback; traceback.print_exc()
    
    def run_once(self):
        """Run a single check"""
        print(f"Checking Cursor usage at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self.check_usage()
    
    def run_continuous(self):
        """Run continuous monitoring"""
        print(f"Starting Cursor usage monitor (checking every {self.config['poll_interval_minutes']} minutes)")
        print("Press Ctrl+C to stop")
        
        try:
            while True:
                self.run_once()
                time.sleep(self.config['poll_interval_minutes'] * 60)
        except KeyboardInterrupt:
            print("\nMonitoring stopped by user")

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--once":
        monitor = CursorMonitor()
        monitor.run_once()
    else:
        monitor = CursorMonitor()
        monitor.run_continuous()

if __name__ == "__main__":
    main() 