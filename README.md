# 🎯 Scenario Trading Mentor

AI-powered trading scenario planning and execution tool. Create battle cards with multiple scenarios, track entries/exits, and get AI-powered market analysis.

## ✨ Features

- **Battle Cards** - Plan trades with 4 scenarios (Primary, Secondary, Chaos, Invalidation)
- **Live Price Tracking** - Real-time Binance Futures prices via WebSocket
- **Market Scanner** - Technical analysis with scoring system (0-100)
- **AI Analysis** - Claude-powered chart analysis and trading thesis generation
- **Paper Trading** - Track positions with live P&L, R-multiples, and leverage
- **Journal** - Record trades with lessons learned
- **AI Mentor** - Chat with Claude about your trades

## 🚀 Quick Deploy to Vercel (Free)

### Step 1: Upload to GitHub
1. Create account at [github.com](https://github.com) (if needed)
2. Create new repository at [github.com/new](https://github.com/new)
3. Upload all files from this project

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New" → "Project"
3. Select your repository
4. Click "Deploy" (no config needed!)

### Step 3: Share
- Vercel gives you URL like: `https://your-app.vercel.app`
- Share this link with anyone!

## 🔑 API Key (Each User Adds Their Own)

**Your friends use their own API keys - not yours!**

Each user:
1. Opens the app → **Settings** (gear icon)
2. Goes to **API** tab
3. Gets free key from [console.anthropic.com](https://console.anthropic.com/account/keys)
4. Pastes key and clicks **Save**

> 🔒 Keys are stored in browser only - never sent to any server.

## 💻 Local Development

```bash
# Install
npm install

# Run
npm run dev

# Open http://localhost:3000
```

**Windows**: Double-click `setup.bat` then `run.bat`

## 🛠️ Tech Stack

- Next.js 15 + TypeScript
- Tailwind CSS
- Zustand (state)
- Anthropic Claude API
- Binance Futures WebSocket

## 📊 How It Works

1. **Prices**: Real-time from Binance Futures
2. **AI**: Uses your Anthropic API key (stored in your browser)
3. **Data**: Saved in browser localStorage (private to each user)
4. **No database**: Each user has their own local data

## 🔒 Privacy

- No server-side storage
- API keys stay in your browser
- Each user's data is completely private
- No tracking or analytics

---

Built for traders who plan their scenarios 📈
