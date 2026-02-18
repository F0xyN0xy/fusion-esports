# Quick Setup Guide

## 🚀 5-Minute Setup

### Step 1: Deploy Website (2 minutes)

1. Go to https://app.netlify.com/drop
2. Drag and drop the main project folder (NOT the discord-bot folder)
3. Wait for deployment
4. Copy your site URL (e.g., `https://fusion-esports-abc123.netlify.app`)

5. Add environment variable:
   - Site Settings → Environment Variables → Add variable
   - Key: `BOT_SECRET_TOKEN`
   - Value: `fusion-secret-2024` (or any random string)
   - Save!

### Step 2: Create Discord Bot (2 minutes)

1. Go to https://discord.com/developers/applications
2. Click "New Application" → Name it "Fusion Esports Manager"
3. Go to "Bot" tab → Click "Add Bot" → Copy TOKEN
4. Go to "OAuth2" → "General" → Copy CLIENT ID
5. Go to "OAuth2" → "URL Generator":
   - Select: `bot` and `applications.commands`
   - Select: `Send Messages`, `Embed Links`
   - Copy URL and invite bot to your server

### Step 3: Setup Bot (1 minute)

1. Open `discord-bot` folder
2. Create `.env` file:
```env
DISCORD_TOKEN=paste_bot_token_here
CLIENT_ID=paste_client_id_here
GUILD_ID=1303027633679896608

WEBSITE_API_URL=https://your-site.netlify.app/api/update-config
BOT_SECRET_TOKEN=fusion-secret-2024

ADMIN_IDS=your_discord_user_id
```

3. Get your Discord User ID:
   - Enable Developer Mode: Discord Settings → Advanced → Developer Mode
   - Right-click your name → Copy ID
   - Paste as `ADMIN_IDS`

4. Run these commands:
```bash
cd discord-bot
npm install
npm run deploy
npm start
```

### Step 4: Test! (30 seconds)

In Discord, type `/ping` - bot should respond!

Try `/set-members count:500+` - then check your website!

## 🆓 Free Hosting for Bot

### Option A: Replit (Easiest)
1. Go to https://replit.com
2. Create account → New Repl → Import
3. Upload discord-bot folder
4. Add environment variables in Secrets tab
5. Click Run!

### Option B: Railway.app
1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Connect your repo
4. Add environment variables
5. Deploy!

## ✅ Checklist

- [ ] Website deployed to Netlify
- [ ] BOT_SECRET_TOKEN set in Netlify
- [ ] Discord bot created
- [ ] Bot invited to server
- [ ] .env file configured
- [ ] Commands deployed (`npm run deploy`)
- [ ] Bot started (`npm start`)
- [ ] `/ping` command works
- [ ] Website updates work

## 🎯 First Commands to Try

```
/ping
/view-config
/set-members count:500+
/set-tournament day:6 hour:18 minute:0
```

Then visit your website to see changes!

## ⚠️ Common Issues

**"Missing Permissions"**
- Add your Discord ID to ADMIN_IDS in .env

**"Unauthorized" from bot**
- Make sure BOT_SECRET_TOKEN matches in .env and Netlify

**Commands don't show up**
- Run `npm run deploy` again
- Wait 5 minutes
- Restart Discord

**Bot offline**
- For free hosting, use UptimeRobot to keep it awake
- Or use paid hosting for 24/7 uptime

---

That's it! You can now manage your website from Discord! 🎉
