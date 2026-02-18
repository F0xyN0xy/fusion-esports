# Fusion Esports - Discord Bot Managed Website

## 🎮 Overview

This is a complete solution for managing your Fusion Esports website using Discord slash commands. No browser admin panel needed - everything is controlled through your Discord server!

### What's Included:
- ✅ **Website** - Clean, modern Fusion Esports site
- ✅ **Discord Bot** - Manage website with slash commands
- ✅ **Admin-Only** - Only server owners/admins can use commands
- ✅ **Free Hosting** - Deploy website to Netlify (free tier)
- ✅ **Persistent Storage** - Netlify Blobs for config storage

## 📁 Project Structure

```
fusion-esports/
├── index.html              # Main website
├── script.js               # Website logic (fetches config from API)
├── style.css               # Website styling
├── logo.png                # Logo image
├── favicon.png             # Browser icon
├── netlify/
│   └── functions/
│       ├── get-config.js   # API: Get current config
│       └── update-config.js # API: Update config (bot only)
├── netlify.toml            # Netlify configuration
├── package.json            # Website dependencies
└── discord-bot/
    ├── bot.js              # Main bot code
    ├── deploy-commands.js  # Register slash commands
    ├── package.json        # Bot dependencies
    └── .env.example        # Environment variables template
```

## 🚀 Setup Guide

### Part 1: Deploy Website to Netlify

1. **Deploy to Netlify:**
   ```bash
   # Drag and drop to https://app.netlify.com/drop
   # OR use Netlify CLI:
   npm install -g netlify-cli
   netlify login
   netlify deploy --prod
   ```

2. **Enable Netlify Blobs:**
   - Netlify Blobs is automatically available on all plans
   - No additional setup required!

3. **Add Environment Variable:**
   - Go to Site Settings → Environment Variables
   - Add: `BOT_SECRET_TOKEN` = (generate a random token, save it!)
   - Example: `my-super-secret-token-12345`

4. **Get your website URL:**
   - Copy your Netlify URL (e.g., `https://fusion-esports.netlify.app`)

### Part 2: Create Discord Bot

1. **Create Bot on Discord Developer Portal:**
   - Go to https://discord.com/developers/applications
   - Click "New Application"
   - Name it "Fusion Esports Manager"
   - Go to "Bot" section
   - Click "Add Bot"
   - **Save the TOKEN** (you'll need this!)

2. **Enable Required Intents:**
   - In Bot settings, enable:
     - ✅ Presence Intent
     - ✅ Server Members Intent
     - ✅ Message Content Intent

3. **Get Application ID:**
   - Go to "OAuth2" → "General"
   - Copy "CLIENT ID"

4. **Invite Bot to Server:**
   - Go to "OAuth2" → "URL Generator"
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Send Messages`, `Embed Links`
   - Copy generated URL and open in browser
   - Invite to your Fusion Esports Discord server

### Part 3: Setup Discord Bot

1. **Navigate to bot folder:**
   ```bash
   cd discord-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file:**
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_application_id_here
   GUILD_ID=1303027633679896608
   
   WEBSITE_API_URL=https://your-site.netlify.app/api/update-config
   BOT_SECRET_TOKEN=same_token_you_set_in_netlify
   
   ADMIN_IDS=your_discord_user_id,another_admin_id
   ```

   **How to get your Discord User ID:**
   - Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
   - Right-click your username → Copy ID

5. **Deploy slash commands:**
   ```bash
   npm run deploy
   ```

6. **Start the bot:**
   ```bash
   npm start
   ```

   You should see:
   ```
   ✅ Logged in as Fusion Esports Manager#1234
   🌐 Managing website at: https://your-site.netlify.app/api/update-config
   ```

## 🤖 Discord Bot Commands

All commands are **admin-only** and use slash commands (type `/` to see them).

### `/ping`
Check if bot is online.

### `/set-members <count>`
Update total member count on website.
```
/set-members count:500+
/set-members count:1.2k
```

### `/set-discord <url>`
Update Discord invite URL.
```
/set-discord url:https://discord.gg/yourcode
```

### `/set-tournament [day] [hour] [minute] [name]`
Update tournament schedule (all optional).
```
/set-tournament day:6 hour:18 minute:0 name:Fusion Weekly
```
- `day`: 0=Sunday, 1=Monday, ..., 6=Saturday
- `hour`: 0-23 (UK time)
- `minute`: 0-59

### `/add-social <platform> <name> <description> <url>`
Add a social media card.
```
/add-social platform:youtube name:New Channel description:Cool content url:https://youtube.com/@example
```

### `/remove-social <name>`
Remove a social media card by name.
```
/remove-social name:Old Channel
```

### `/view-config`
View current website configuration.

## 🆓 Free Hosting Options

### Option 1: Replit (Recommended for Free)

1. Go to https://replit.com
2. Create new Repl → Import from GitHub
3. Upload your `discord-bot` folder
4. Set environment variables in "Secrets" tab
5. Click "Run"
6. Enable "Always On" (paid) or use UptimeRobot for keep-alive

### Option 2: Railway.app

1. Go to https://railway.app
2. "New Project" → "Deploy from GitHub"
3. Select your bot repository
4. Add environment variables
5. Deploy (free tier: $5 credit/month)

### Option 3: Render.com

1. Go to https://render.com
2. "New" → "Background Worker"
3. Connect GitHub repo
4. Set environment variables
5. Deploy (free tier available)

### Keep-Alive for Free Hosting

If using free hosting that sleeps after inactivity:

1. **Add to bot `.env`:**
   ```env
   KEEP_ALIVE=true
   ```

2. **Use UptimeRobot:**
   - Go to https://uptimerobot.com
   - Add monitor for your bot's health endpoint
   - Pings every 5 minutes to keep it awake

## ⚙️ Configuration

### Website Configuration (via Discord bot)

All website settings are managed through Discord commands:

- **Discord URL** - Main invite link
- **Member Count** - Total members display
- **Tournament Schedule** - Day, time, name
- **Social Cards** - Team member social media

### Bot Permissions

Only users listed in `ADMIN_IDS` can use bot commands. To add more admins:

1. Get their Discord User ID
2. Edit `.env` file
3. Add to `ADMIN_IDS`: `id1,id2,id3`
4. Restart bot

## 🔒 Security

- **Bot Token**: Never share your bot token
- **Secret Token**: Must match between bot and Netlify
- **Admin IDs**: Only specified users can control website
- **API Protection**: Update endpoint requires valid token

## 🐛 Troubleshooting

### Bot won't start
- ✅ Check `.env` file has all required values
- ✅ Verify Discord token is correct
- ✅ Make sure bot is invited to server
- ✅ Check `GUILD_ID` matches your server

### Commands don't appear
- ✅ Run `npm run deploy` in bot folder
- ✅ Wait 5 minutes for Discord to register
- ✅ Make sure bot has permission to create commands

### "Unauthorized" error when using commands
- ✅ Add your Discord User ID to `ADMIN_IDS`
- ✅ Restart bot after changing `.env`

### Website doesn't update
- ✅ Check bot console for errors
- ✅ Verify `WEBSITE_API_URL` is correct
- ✅ Confirm `BOT_SECRET_TOKEN` matches Netlify env var
- ✅ Check Netlify function logs for errors

### Bot goes offline (free hosting)
- ✅ Enable keep-alive in bot
- ✅ Use UptimeRobot to ping bot
- ✅ Consider using paid hosting for 24/7 uptime

## 📝 Example Workflow

1. **Update member count:**
   ```
   /set-members count:650+
   ```

2. **Change tournament time:**
   ```
   /set-tournament day:5 hour:20 minute:30
   ```

3. **Add new team member social:**
   ```
   /add-social platform:youtube name:ProPlayer123 description:Highlight reels url:https://youtube.com/@proplayer
   ```

4. **View current config:**
   ```
   /view-config
   ```

5. **Check website** - Changes appear immediately!

## 🎯 What Was Removed

Compared to the previous version:

- ❌ Browser admin panel (Ctrl+Shift+A)
- ❌ Password login system
- ❌ Client-side configuration UI

Everything is now managed through Discord - simpler and more secure!

## 💡 Tips

- Use `/view-config` before making changes to see current settings
- Member count can be text like "500+" or "1.2k"
- Tournament times are always in UK time (GMT/BST)
- Social cards appear in the order they're added
- Bot must be online for commands to work

## 🆘 Need Help?

1. Check this README thoroughly
2. Review error messages in bot console
3. Check Netlify function logs
4. Verify all environment variables are set
5. Make sure Discord bot has proper permissions

---

**Managed by Discord, powered by Netlify!** 🎮🤖
