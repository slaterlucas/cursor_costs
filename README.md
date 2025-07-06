# Cursor Usage Monitor

A Python script that monitors your Cursor AI usage and sends notifications when spending increases, so you don't get surprised by unexpected charges.

## Features

- 🔔 **Smart Notifications**: Only alerts when spending increases by your threshold (default: $0.50+)
- 📊 **Real-time Monitoring**: Polls Cursor's billing API every 5 minutes
- 🎯 **Multiple Notification Methods**: Console, desktop notifications, webhooks (Slack/Discord)
- 🔒 **Secure**: Stores session tokens safely, handles auth errors gracefully
- 📝 **Detailed Logging**: Shows recent usage events with model and cost breakdown

## Quick Start

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run setup**:
   ```bash
   python setup_monitor.py
   ```
   
3. **Get your session token**:
   - Open Cursor dashboard in browser
   - Open DevTools (F12) → Network tab
   - Reload page, find `get-monthly-invoice` request
   - Right-click → Copy as cURL
   - Paste into setup script

4. **Start monitoring**:
   ```bash
   python cursor_monitor.py
   ```

## Usage

### Continuous monitoring:
```bash
python cursor_monitor.py
```

### Single check:
```bash
python cursor_monitor.py --once
```

## Configuration

The setup script creates `cursor_monitor_config.json`:

```json
{
  "session_token": "your_session_token_here",
  "notification_threshold_cents": 50,
  "poll_interval_minutes": 5,
  "notification_methods": {
    "console": true,
    "desktop": false,
    "webhook": false,
    "webhook_url": ""
  }
}
```

### Settings:
- **notification_threshold_cents**: Minimum spending increase to trigger alert (50 = $0.50)
- **poll_interval_minutes**: How often to check (5 = every 5 minutes)
- **console**: Print notifications to terminal
- **desktop**: Show system notifications (requires `plyer`)
- **webhook**: Send to Slack/Discord webhook URL

## Sample Output

```
🔔 2025-01-06 14:30:15 - Spending increased by $2.17 (Total: $24.32)
  • 14:28:43 - $2.173 (claude-4-sonnet-thinking)
  • 14:27:18 - $1.480 (o3)
  • 14:26:57 - $0.892 (o3)
```

## Session Token Management

Your session token will eventually expire. When this happens:

1. You'll see "Authentication failed" errors
2. Get a fresh token from the dashboard
3. Update `cursor_monitor_config.json` or re-run setup

## Running in Background

### macOS/Linux:
```bash
# Run in background
nohup python cursor_monitor.py > cursor_monitor.log 2>&1 &

# Stop background process
pkill -f cursor_monitor.py
```

### systemd service (Linux):
Create `/etc/systemd/system/cursor-monitor.service`:
```ini
[Unit]
Description=Cursor Usage Monitor
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/path/to/cursor-monitor
ExecStart=/usr/bin/python3 cursor_monitor.py
Restart=always

[Install]
WantedBy=multi-user.target
```

## Troubleshooting

**"Authentication failed"**: Session token expired, get a new one from dashboard

**"No usage items found"**: API response format changed, check if endpoint still works

**Desktop notifications not working**: Install plyer: `pip install plyer`

**High CPU usage**: Increase poll interval in config (e.g., 10-15 minutes)

## Security Notes

- Session tokens are stored in plain text config files
- Don't commit config files to version control
- Consider using environment variables for production deployments
- Session tokens have the same access as your Cursor account

## License

MIT License - feel free to modify and distribute! 