# 🚀 QUICK START - Fusion Esports

## What You Downloaded

Everything you need to run your Fusion Esports website + Discord bot!

## 📁 What's Inside

```
fusion-esports/
├── Website files (deploy to Netlify)
│   ├── index.html, script.js, style.css
│   ├── logo.png, favicon.png
│   ├── netlify/ (API functions)
│   └── package.json
│
└── discord-bot/ (run separately)
    ├── bot.js
    ├── deploy-commands.js
    ├── package.json
    └── .env.example (⚠️ YOU NEED TO CONFIGURE THIS!)
```

## ⚡ 3-Step Setup

### Step 1: Deploy Website (2 minutes)

1. Go to https://app.netlify.com/drop
2. Drag and drop the **entire folder** (not the zip, extract it first!)
3. Wait for deployment
4. Copy your site URL (e.g., `https://fusion-esports-abc123.netlify.app`)

**Add Environment Variable in Netlify:**
- Go to: Site Settings → Environment Variables → Add variable
- Key: `BOT_SECRET_TOKEN`
- Value: `fusion-secret-2024` (or any random string)
- Click Save

### Step 2: Setup Discord Bot (3 minutes)

**A) Create Bot:**
1. Go to https://discord.com/developers/applications
2. Click **"New Application"** → Name it "Fusion Esports Manager"
3. Go to **"Bot"** tab → Click **"Add Bot"**
4. Click **"Reset Token"** → **COPY THE TOKEN** ⚠️
5. Go to **"OAuth2" → "General"** → **COPY THE CLIENT ID**

**B) Invite Bot to Server:**
1. Go to **"OAuth2" → "URL Generator"**
2. Select: `bot` and `applications.commands`
3. Select permissions: `Send Messages`, `Embed Links`
4. Copy URL and open in browser
5. Select your Discord server → Authorize

**C) Get Your User ID:**
1. In Discord: Settings → Advanced → Enable "Developer Mode"
2. Right-click your username → Copy User ID

### Step 3: Configure Bot (2 minutes)

**In the `discord-bot` folder:**

1. **Rename `.env.example` to `.env`**
2. **Open `.env` in Notepad and fill in:**

```env
DISCORD_TOKEN=paste_your_bot_token_here
CLIENT_ID=paste_your_client_id_here
GUILD_ID=1303027633679896608

WEBSITE_API_URL=https://your-site.netlify.app/api/update-config
BOT_SECRET_TOKEN=fusion-secret-2024

ADMIN_IDS=paste_your_user_id_here
```

3. **Save the file**

## 🎮 Run the Bot

Open Command Prompt (Windows) or Terminal (Mac/Linux):

```bash
cd discord-bot
npm install
npm run deploy
npm start
```

**You should see:**
```
✅ Logged in as Fusion Esports Manager#1234
🌐 Managing website at: https://your-site.netlify.app/api/update-config
```

## 🧪 Test It!

In Discord, type `/` and you should see your bot's commands!

Try:
```
/ping
/set-members count:500+
```

Then check your website - the member count should update!

## ❓ Questions Answered

### "Where do I get the Discord Token?"
Discord Developer Portal → Your App → Bot → Reset Token → Copy

### "The bot needs to run constantly?"
Yes, the bot needs to be online to respond to commands. Options:
- Keep it running on your PC (closes when you turn off PC)
- Deploy to Replit (free, stays online)
- Deploy to Railway.app (free $5/month credit)
- Use a VPS ($3-5/month for 24/7)

See README.md for detailed hosting options.

### "Can the website run without the bot?"
YES! The website works independently. The bot is only needed to UPDATE the website through Discord commands.

### "What if I close the bot?"
The website still works! You just can't update it via Discord until you start the bot again.

### "Does this cost money?"
- **Website**: FREE (Netlify free tier)
- **Bot**: FREE if using Replit (with UptimeRobot to keep awake)
- Paid options for 24/7 bot hosting: $3-7/month

## 🐛 Common Errors

**Error: "TokenInvalid"**
→ You didn't create `.env` file or didn't add your bot token

**Error: "Cannot find package 'discord.js'"**
→ You forgot to run `npm install` in the discord-bot folder

**Commands don't appear in Discord**
→ Run `npm run deploy` and wait 5 minutes

**"Unauthorized" when using commands**
→ Add your User ID to `ADMIN_IDS` in `.env`

## 📚 Full Documentation

- **README.md** - Complete guide
- **SETUP.md** - Detailed setup instructions

## 🆘 Still Need Help?

Check README.md for:
- Complete bot hosting options
- Troubleshooting guide
- All available commands
- Security best practices

---

**Your website and bot are ready to go!** 🎉
