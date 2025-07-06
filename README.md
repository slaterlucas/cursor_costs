# Cursor Costs

A modern web application that monitors your Cursor AI usage in real-time and sends browser notifications when spending increases, so you never get surprised by unexpected charges.

## ✨ Features

- 🔔 **Smart Session Tracking**: Only tracks spending from your current coding session
- 📊 **Real-time Dashboard**: Live charts and spending history with dark theme
- 🚨 **Browser Notifications**: Desktop alerts when spending increases above your threshold
- 🔕 **Snooze Notifications**: Temporarily disable alerts (15min, 30min, 1hr, 2hr)
- 🎯 **Configurable Thresholds**: Set custom spending increase alerts (e.g., $0.50+)
- 📱 **Modern UI**: Clean, responsive interface with live status indicators
- 🔒 **Client-side Only**: No data leaves your browser - completely private
- ⚡ **Instant Setup**: 3-step wizard with demo video

## 🚀 Quick Start

### Option 1: Use the Live Demo
Visit **[cursor-costs.vercel.app](https://cursor-costs.vercel.app)** and follow the 3-step setup wizard.

### Option 2: Run Locally
```bash
# Clone the repository
git clone https://github.com/yourusername/cursor-costs.git
cd cursor-costs

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3001
```

## 📖 How to Use

### 1. **Extract Your Session Token**
- Open [Cursor Dashboard](https://cursor.com/dashboard?tab=usage) in your browser
- Open DevTools (F12) → Network tab
- Reload the page and find the `get-monthly-invoice` request
- Right-click → Copy as cURL
- Paste into the setup wizard

### 2. **Configure Notifications**
- Set your spending threshold (e.g., $0.50)
- Choose notification interval (1-60 minutes)
- Enable browser notifications

### 3. **Start Monitoring**
- Keep the browser tab open
- Get notified when your session spending increases
- View real-time charts and recent usage events

## ⚙️ Configuration

All settings are stored in your browser's localStorage:

```json
{
  "sessionToken": "your_session_token_here",
  "threshold": 0.5,
  "cooldown": 5,
  "notifications": {
    "browser": true
  },
  "setupDate": "2025-01-06T..."
}
```

### **Settings Explained**
- **threshold**: Minimum spending increase to trigger notification (in dollars)
- **cooldown**: How often to check for new charges (in minutes)
- **browser**: Enable/disable browser notifications

## 🔔 Notification System

### **When You Get Notified**
- Spending increases by your threshold amount or more
- Only during your current coding session (resets when you restart)
- Respects the cooldown period to avoid spam

### **Snooze Options**
- **15 minutes**: Short break from notifications
- **30 minutes**: Focus time for deep work
- **1 hour**: Extended coding session
- **2 hours**: Long project work

### **Smart Features**
- Auto-clears expired snooze periods
- Shows remaining snooze time in button
- Persists across browser refreshes

## 🔧 Development

### **Tech Stack**
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Recharts**: Interactive charts
- **Lucide React**: Beautiful icons

### **Project Structure**
```
cursor-costs/
├── app/
│   ├── api/cursor-usage/     # API proxy for CORS
│   ├── components/           # React components
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Setup wizard
├── public/                  # Static assets
├── next.config.js           # Next.js config
└── tailwind.config.js       # Tailwind config
```

### **Local Development**
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🔒 Privacy & Security

- **No Server Storage**: All data stays in your browser
- **Session Tokens**: Stored locally, never transmitted to third parties
- **API Proxy**: Only used to bypass CORS, doesn't log requests
- **Open Source**: Full transparency - inspect the code yourself

## 🐛 Troubleshooting

### **"Authentication failed"**
Your session token has expired. Get a fresh one from the Cursor dashboard and reconfigure.

### **"No notifications appearing"**
1. Check browser notification permissions in System Settings
2. Ensure the threshold isn't set too high
3. Verify you're not in a snooze period

### **"Chart showing old data"**
Click the settings gear and reset the setup to clear all stored data.

### **"API errors"**
The Cursor API endpoint may have changed. Check the browser console for detailed error messages.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - feel free to modify and distribute!

## 🙏 Acknowledgments

- Built for the Cursor AI community
- Inspired by the need for transparent usage monitoring
- Thanks to all contributors and users providing feedback

---

**⚠️ Disclaimer**: This tool is not affiliated with Cursor. Use responsibly and respect Cursor's terms of service. 