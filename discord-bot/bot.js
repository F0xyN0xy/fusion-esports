import { Client, GatewayIntentBits, EmbedBuilder, Events, PermissionsBitField, ActivityType, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
config();

// ═══════════════════════════════════════════════════════
//  CLIENT
// ═══════════════════════════════════════════════════════
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,   // needed for online count — enable in Dev Portal
        GatewayIntentBits.MessageContent,
    ]
});

// ═══════════════════════════════════════════════════════
//  FILE HELPERS
// ═══════════════════════════════════════════════════════
function readJSON(file, fallback = {}) {
    try { return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback; }
    catch { return fallback; }
}
function writeJSON(file, data) {
    writeFileSync(file, JSON.stringify(data, null, 2));
}

const WELCOME_FILE   = './welcome-config.json';
const XP_FILE        = './xp-data.json';
const YT_FILE        = './yt-channels.json';
const YT_SEEN_FILE   = './yt-seen.json';

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════
function isAdmin(userId) {
    return (process.env.ADMIN_IDS?.split(',').map(id => id.trim()) || []).includes(userId);
}

async function updateWebsiteConfig(updates) {
    const token  = process.env.BOT_SECRET_TOKEN;
    const apiUrl = process.env.WEBSITE_API_URL;
    if (!token)  throw new Error('BOT_SECRET_TOKEN missing from .env');
    if (!apiUrl) throw new Error('WEBSITE_API_URL missing from .env');
    const res  = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Bot-Token': token },
        body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update website');
    return data;
}

async function getCurrentConfig() {
    try {
        const url = process.env.WEBSITE_API_URL?.replace('/update-config', '/get-config');
        if (!url) return null;
        return await (await fetch(url)).json();
    } catch { return null; }
}

// ═══════════════════════════════════════════════════════
//  XP SYSTEM
// ═══════════════════════════════════════════════════════
const XP_PER_MESSAGE = 15;
const XP_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown per user
const xpCooldowns = new Map();

function getLevel(xp) { return Math.floor(0.1 * Math.sqrt(xp)); }
function xpForLevel(level) { return Math.pow(level / 0.1, 2); }
function xpForNextLevel(level) { return Math.pow((level + 1) / 0.1, 2); }

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;

    const now    = Date.now();
    const last   = xpCooldowns.get(message.author.id) || 0;
    if (now - last < XP_COOLDOWN_MS) return;
    xpCooldowns.set(message.author.id, now);

    const xpData = readJSON(XP_FILE);
    const uid    = message.author.id;
    if (!xpData[uid]) xpData[uid] = { xp: 0, messages: 0 };

    const oldLevel = getLevel(xpData[uid].xp);
    xpData[uid].xp += XP_PER_MESSAGE + Math.floor(Math.random() * 10); // 15-24 XP per message
    xpData[uid].messages = (xpData[uid].messages || 0) + 1;
    const newLevel = getLevel(xpData[uid].xp);
    writeJSON(XP_FILE, xpData);

    // Level up notification
    if (newLevel > oldLevel) {
        const embed = new EmbedBuilder()
            .setColor('#9333ea')
            .setTitle('⬆️ Level Up!')
            .setDescription(`${message.author} just reached **Level ${newLevel}**! 🎉`)
            .setThumbnail(message.author.displayAvatarURL())
            .setTimestamp();
        await message.channel.send({ embeds: [embed] });
    }
});

// ═══════════════════════════════════════════════════════
//  YOUTUBE RSS CHECKER
// ═══════════════════════════════════════════════════════
async function checkYouTubeFeeds() {
    const channels = readJSON(YT_FILE, []);
    const seen     = readJSON(YT_SEEN_FILE, {});
    if (!channels.length) return;

    for (const ch of channels) {
        try {
            const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`;
            const res    = await fetch(rssUrl);
            const xml    = await res.text();

            // Parse latest video from RSS
            const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
            if (!entryMatch) continue;

            const entry     = entryMatch[1];
            const videoId   = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
            const title     = entry.match(/<title>(.*?)<\/title>/)?.[1];
            const published = entry.match(/<published>(.*?)<\/published>/)?.[1];

            if (!videoId || seen[ch.channelId] === videoId) continue;

            // New video found!
            seen[ch.channelId] = videoId;
            writeJSON(YT_SEEN_FILE, seen);

            const notifyChannel = client.channels.cache.get(ch.notifyChannelId);
            if (!notifyChannel) continue;

            const mention = ch.roleId ? `<@&${ch.roleId}>` : '@everyone';
            const embed   = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle(`🎥 New Video — ${ch.name}`)
                .setDescription(`**[${title}](https://www.youtube.com/watch?v=${videoId})**`)
                .setURL(`https://www.youtube.com/watch?v=${videoId}`)
                .setThumbnail(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`)
                .addFields({ name: 'Published', value: new Date(published).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) })
                .setTimestamp();

            await notifyChannel.send({ content: `${mention} New video just dropped!`, embeds: [embed] });

        } catch (err) {
            console.error(`YouTube RSS error for ${ch.name}:`, err.message);
        }
    }
}

// ═══════════════════════════════════════════════════════
//  STATUS ROTATION
// ═══════════════════════════════════════════════════════
const DEFAULT_STATUSES = [
    { name: 'Rocket League',  type: ActivityType.Watching  },
    { name: 'the Community',  type: ActivityType.Watching  },
    { name: 'Fusion Esports', type: ActivityType.Watching  },
    { name: 'for new members',type: ActivityType.Watching  },
];
let statusIndex = 0;
let customStatus = null;



// ═══════════════════════════════════════════════════════
//  COMMAND DEFINITIONS  (used by auto-deploy)
// ═══════════════════════════════════════════════════════
function buildCommands() {
    return [
        new SlashCommandBuilder().setName('ping').setDescription('Check if the bot is online'),
        new SlashCommandBuilder().setName('server-info').setDescription('Show server stats'),
        new SlashCommandBuilder().setName('set-status').setDescription('Change the bot status')
            .addStringOption(o => o.setName('text').setDescription('Status text (leave empty to resume auto-rotation)'))
            .addStringOption(o => o.setName('type').setDescription('Activity type').addChoices(
                { name: 'Watching',  value: 'watching'  },
                { name: 'Playing',   value: 'playing'   },
                { name: 'Listening', value: 'listening' },
                { name: 'Competing', value: 'competing' },
            )),
        new SlashCommandBuilder().setName('announce').setDescription('Post an announcement embed')
            .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(true))
            .addStringOption(o => o.setName('title').setDescription('Title').setRequired(true))
            .addStringOption(o => o.setName('message').setDescription('Body text').setRequired(true))
            .addStringOption(o => o.setName('color').setDescription('Embed colour').addChoices(
                { name: 'Purple (default)', value: 'purple' }, { name: 'Blue', value: 'blue' },
                { name: 'Green', value: 'green' }, { name: 'Red', value: 'red' },
                { name: 'Orange', value: 'orange' }, { name: 'Yellow', value: 'yellow' }, { name: 'White', value: 'white' },
            ))
            .addRoleOption(o => o.setName('role').setDescription('Role to ping')),
        new SlashCommandBuilder().setName('clear').setDescription('Bulk delete messages')
            .addIntegerOption(o => o.setName('amount').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
            .addChannelOption(o => o.setName('channel').setDescription('Channel to clear (defaults to current)')),
        new SlashCommandBuilder().setName('tournament-reminder').setDescription('Send a tournament starting reminder')
            .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(true))
            .addStringOption(o => o.setName('time').setDescription('How soon?').setRequired(true).addChoices(
                { name: '30 minutes', value: '30min' }, { name: '10 minutes', value: '10min' }, { name: 'Starting NOW', value: 'now' },
            ))
            .addRoleOption(o => o.setName('role').setDescription('Role to ping'))
            .addStringOption(o => o.setName('name').setDescription('Tournament name')),
        new SlashCommandBuilder().setName('scrim-ping').setDescription('Ping for scrims')
            .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(true))
            .addRoleOption(o => o.setName('role').setDescription('Scrims role to ping').setRequired(true))
            .addStringOption(o => o.setName('team_size').setDescription('Format').addChoices(
                { name: '1v1', value: '1v1' }, { name: '2v2', value: '2v2' }, { name: '3v3', value: '3v3' },
            ))
            .addStringOption(o => o.setName('rank').setDescription('Rank requirement'))
            .addStringOption(o => o.setName('time').setDescription('Time'))
            .addStringOption(o => o.setName('note').setDescription('Extra info')),
        new SlashCommandBuilder().setName('yt-add').setDescription('Track a YouTube channel for new video notifications')
            .addStringOption(o => o.setName('name').setDescription('Friendly name').setRequired(true))
            .addStringOption(o => o.setName('channel_id').setDescription('YouTube Channel ID (UC...)').setRequired(true))
            .addChannelOption(o => o.setName('notify_channel').setDescription('Discord channel for notifications').setRequired(true))
            .addRoleOption(o => o.setName('role').setDescription('Role to ping')),
        new SlashCommandBuilder().setName('yt-remove').setDescription('Stop tracking a YouTube channel')
            .addStringOption(o => o.setName('name').setDescription('Friendly name to remove').setRequired(true)),
        new SlashCommandBuilder().setName('yt-list').setDescription('List all tracked YouTube channels'),
        new SlashCommandBuilder().setName('view-config').setDescription('View website configuration'),
        new SlashCommandBuilder().setName('set-members').setDescription('Update member count on website')
            .addStringOption(o => o.setName('count').setDescription('e.g. 500+ or 1.2k').setRequired(true)),
        new SlashCommandBuilder().setName('set-online').setDescription('Update online count on website')
            .addStringOption(o => o.setName('count').setDescription('Number or blank for auto')),
        new SlashCommandBuilder().setName('set-discord').setDescription('Update Discord invite URL on website')
            .addStringOption(o => o.setName('url').setDescription('Discord invite URL').setRequired(true)),
        new SlashCommandBuilder().setName('set-tournament').setDescription('Update tournament schedule on website')
            .addIntegerOption(o => o.setName('day').setDescription('Day of week (0=Sun, 6=Sat)').setMinValue(0).setMaxValue(6))
            .addIntegerOption(o => o.setName('hour').setDescription('Hour in UK time (0-23)').setMinValue(0).setMaxValue(23))
            .addIntegerOption(o => o.setName('minute').setDescription('Minute (0-59)').setMinValue(0).setMaxValue(59))
            .addStringOption(o => o.setName('name').setDescription('Tournament name'))
            .addIntegerOption(o => o.setName('upcoming_count').setDescription('Upcoming dates to show (1-10)').setMinValue(1).setMaxValue(10)),
        new SlashCommandBuilder().setName('add-social').setDescription('Add a social card to the website')
            .addStringOption(o => o.setName('platform').setDescription('Platform').setRequired(true).addChoices(
                { name: 'YouTube', value: 'youtube' }, { name: 'TikTok', value: 'tiktok' },
                { name: 'Twitter/X', value: 'twitter' }, { name: 'Twitch', value: 'twitch' },
                { name: 'Instagram', value: 'instagram' }, { name: 'Website', value: 'website' },
            ))
            .addStringOption(o => o.setName('name').setDescription('Display name').setRequired(true))
            .addStringOption(o => o.setName('description').setDescription('Short description').setRequired(true))
            .addStringOption(o => o.setName('url').setDescription('Full URL').setRequired(true)),
        new SlashCommandBuilder().setName('remove-social').setDescription('Remove a social card from the website')
            .addStringOption(o => o.setName('name').setDescription('Name of card to remove').setRequired(true)),
        new SlashCommandBuilder().setName('rank').setDescription('Check your XP rank')
            .addUserOption(o => o.setName('user').setDescription('User to check (leave empty for yourself)')),
        new SlashCommandBuilder().setName('leaderboard').setDescription('Show the top 10 XP leaderboard'),
        new SlashCommandBuilder().setName('coinflip').setDescription('Flip a coin'),
        new SlashCommandBuilder().setName('poll').setDescription('Create a poll with reactions')
            .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true))
            .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true))
            .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true))
            .addStringOption(o => o.setName('option3').setDescription('Option 3'))
            .addStringOption(o => o.setName('option4').setDescription('Option 4')),
        new SlashCommandBuilder().setName('welcome-setup').setDescription('Configure welcome messages')
            .addChannelOption(o => o.setName('channel').setDescription('Channel for welcome messages').setRequired(true))
            .addStringOption(o => o.setName('message').setDescription('Template — use {user}, {server}, {membercount}').setRequired(true)),
        new SlashCommandBuilder().setName('welcome-disable').setDescription('Disable welcome messages'),
    ].map(c => c.toJSON());
}

// ═══════════════════════════════════════════════════════
//  AUTO DEPLOY COMMANDS ON STARTUP
// ═══════════════════════════════════════════════════════
async function deployCommands() {
    const token    = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;
    const guildId  = process.env.GUILD_ID;
    if (!token || !clientId || !guildId) {
        console.warn('⚠️  Skipping command deploy — DISCORD_TOKEN, CLIENT_ID or GUILD_ID not set');
        return;
    }
    try {
        const rest = new REST({ version: '10' }).setToken(token);
        const commands = buildCommands();
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log(`✅ Deployed ${commands.length} slash commands automatically`);
    } catch (err) {
        console.error('⚠️  Command deploy failed:', err.message);
    }
}

client.on('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`🌐 Website API: ${process.env.WEBSITE_API_URL || '⚠️ not set'}`);
    if (!process.env.BOT_SECRET_TOKEN) console.warn('⚠️ BOT_SECRET_TOKEN not set');

    // Auto-deploy slash commands
    await deployCommands();

    client.user.setActivity(DEFAULT_STATUSES[0].name, { type: DEFAULT_STATUSES[0].type });

    // Status rotation every 5 min
    setInterval(() => {
        if (customStatus) return;
        statusIndex = (statusIndex + 1) % DEFAULT_STATUSES.length;
        const s = DEFAULT_STATUSES[statusIndex];
        client.user.setActivity(s.name, { type: s.type });
    }, 5 * 60 * 1000);

    // YouTube check every 10 min
    checkYouTubeFeeds();
    setInterval(checkYouTubeFeeds, 10 * 60 * 1000);
});

// ═══════════════════════════════════════════════════════
//  COMMAND HANDLER
// ═══════════════════════════════════════════════════════
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const adminOnly = [
        'set-members','set-online','set-discord','set-tournament',
        'add-social','remove-social','view-config','announce','clear',
        'set-status','welcome-setup','welcome-disable',
        'yt-add','yt-remove','yt-list',
        'tournament-reminder','scrim-ping',
    ];

    if (adminOnly.includes(interaction.commandName) && !isAdmin(interaction.user.id)) {
        return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
    }

    try {
        switch (interaction.commandName) {

            // ────────────────────────────────────────────
            //  WEBSITE COMMANDS
            // ────────────────────────────────────────────
            case 'set-members': {
                await interaction.deferReply({ ephemeral: true });
                const count = interaction.options.getString('count');
                await updateWebsiteConfig({ memberCount: count });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Member Count Updated').setDescription(`Website now shows **${count}** members.`).setTimestamp()] });
                break;
            }

            case 'set-online': {
                await interaction.deferReply({ ephemeral: true });
                const count  = interaction.options.getString('count');
                const isAuto = !count || count.toLowerCase() === 'auto';
                await updateWebsiteConfig({ onlineCount: isAuto ? 'auto' : count });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Online Count Updated').setDescription(isAuto ? 'Now fetching live from Discord widget.' : `Website shows **${count}** online.`).setTimestamp()] });
                break;
            }

            case 'set-discord': {
                await interaction.deferReply({ ephemeral: true });
                const url = interaction.options.getString('url');
                if (!url.includes('discord.gg/') && !url.includes('discord.com/invite/')) return interaction.editReply('❌ Invalid Discord invite URL.');
                await updateWebsiteConfig({ discordUrl: url });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Discord URL Updated').setDescription(url).setTimestamp()] });
                break;
            }

            case 'set-tournament': {
                await interaction.deferReply({ ephemeral: true });
                const day   = interaction.options.getInteger('day');
                const hour  = interaction.options.getInteger('hour');
                const min   = interaction.options.getInteger('minute');
                const name  = interaction.options.getString('name');
                const count = interaction.options.getInteger('upcoming_count');
                const updates = { tournament: {} };
                if (day   !== null) updates.tournament.dayOfWeek     = day;
                if (hour  !== null) updates.tournament.hour          = hour;
                if (min   !== null) updates.tournament.minute        = min;
                if (name)           updates.tournament.name          = name;
                if (count !== null) updates.tournament.upcomingCount = count;
                await updateWebsiteConfig(updates);
                const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Tournament Updated').addFields(
                    { name: 'Day',  value: day  !== null ? DAYS[day] : 'unchanged', inline: true },
                    { name: 'Time', value: hour !== null && min !== null ? `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')} UK` : 'unchanged', inline: true },
                    { name: 'Name', value: name || 'unchanged', inline: true },
                ).setTimestamp()] });
                break;
            }

            case 'add-social': {
                await interaction.deferReply({ ephemeral: true });
                const platform = interaction.options.getString('platform');
                const name     = interaction.options.getString('name');
                const desc     = interaction.options.getString('description');
                const url      = interaction.options.getString('url');
                const cfg      = await getCurrentConfig();
                const socials  = [...(cfg?.socials || []), { platform, name, desc, url }];
                await updateWebsiteConfig({ socials });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Social Card Added').addFields({ name: 'Name', value: name, inline: true }, { name: 'Platform', value: platform, inline: true }, { name: 'URL', value: url }).setTimestamp()] });
                break;
            }

            case 'remove-social': {
                await interaction.deferReply({ ephemeral: true });
                const name = interaction.options.getString('name');
                const cfg  = await getCurrentConfig();
                const before  = cfg?.socials || [];
                const socials = before.filter(s => s.name !== name);
                if (socials.length === before.length) return interaction.editReply(`❌ No card found with name: **${name}**`);
                await updateWebsiteConfig({ socials });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Social Card Removed').setDescription(`Removed: **${name}**`).setTimestamp()] });
                break;
            }

            case 'view-config': {
                await interaction.deferReply({ ephemeral: true });
                const cfg = await getCurrentConfig();
                if (!cfg) return interaction.editReply('❌ Failed to fetch config.');
                const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                const socialsText = (cfg.socials || []).map((s,i) => `${i+1}. **${s.name}** (${s.platform})`).join('\n') || 'None';
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('📋 Website Config').addFields(
                    { name: '👥 Members',    value: cfg.memberCount || 'auto', inline: true },
                    { name: '🟢 Online',     value: cfg.onlineCount || 'auto', inline: true },
                    { name: '🔗 Discord',    value: cfg.discordUrl  || 'Not set', inline: false },
                    { name: '🏆 Tournament', value: `**${cfg.tournament?.name || 'Fusion Weekly'}**\n${DAYS[cfg.tournament?.dayOfWeek ?? 6]} at ${String(cfg.tournament?.hour ?? 18).padStart(2,'0')}:${String(cfg.tournament?.minute ?? 0).padStart(2,'0')} UK`, inline: false },
                    { name: '📱 Socials',    value: socialsText, inline: false }
                ).setTimestamp()] });
                break;
            }

            // ────────────────────────────────────────────
            //  YOUTUBE COMMANDS
            // ────────────────────────────────────────────
            case 'yt-add': {
                await interaction.deferReply({ ephemeral: true });
                const name      = interaction.options.getString('name');
                const channelId = interaction.options.getString('channel_id');
                const notifyCh  = interaction.options.getChannel('notify_channel');
                const role      = interaction.options.getRole('role');

                const channels = readJSON(YT_FILE, []);
                const exists   = channels.find(c => c.channelId === channelId);
                if (exists) return interaction.editReply(`❌ That YouTube channel is already being tracked as **${exists.name}**.`);

                channels.push({
                    name,
                    channelId,
                    notifyChannelId: notifyCh.id,
                    roleId: role?.id || null,
                });
                writeJSON(YT_FILE, channels);

                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#ff0000').setTitle('✅ YouTube Channel Added').addFields(
                    { name: 'Channel',  value: name,           inline: true },
                    { name: 'Post in',  value: `${notifyCh}`,  inline: true },
                    { name: 'Ping',     value: role ? `<@&${role.id}>` : '@everyone', inline: true },
                    { name: 'Channel ID', value: channelId },
                ).setDescription('The bot will check for new videos every 10 minutes.').setTimestamp()] });
                break;
            }

            case 'yt-remove': {
                await interaction.deferReply({ ephemeral: true });
                const name     = interaction.options.getString('name');
                const channels = readJSON(YT_FILE, []);
                const filtered = channels.filter(c => c.name !== name);
                if (filtered.length === channels.length) return interaction.editReply(`❌ No YouTube channel tracked with name: **${name}**`);
                writeJSON(YT_FILE, filtered);
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ YouTube Channel Removed').setDescription(`Stopped tracking: **${name}**`).setTimestamp()] });
                break;
            }

            case 'yt-list': {
                await interaction.deferReply({ ephemeral: true });
                const channels = readJSON(YT_FILE, []);
                if (!channels.length) return interaction.editReply('No YouTube channels are being tracked yet. Use `/yt-add` to add one.');
                const list = channels.map((c,i) => `${i+1}. **${c.name}** → <#${c.notifyChannelId}>${c.roleId ? ` (<@&${c.roleId}>)` : ''}`).join('\n');
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#ff0000').setTitle('📺 Tracked YouTube Channels').setDescription(list).setTimestamp()] });
                break;
            }

            // ────────────────────────────────────────────
            //  TOURNAMENT REMINDER
            // ────────────────────────────────────────────
            case 'tournament-reminder': {
                await interaction.deferReply({ ephemeral: true });
                const channel  = interaction.options.getChannel('channel');
                const role     = interaction.options.getRole('role');
                const timeLeft = interaction.options.getString('time');
                const name     = interaction.options.getString('name') || 'Fusion Weekly';

                const mention = role ? `<@&${role.id}>` : '@everyone';
                const timeEmoji = timeLeft === '30min' ? '⏰' : timeLeft === '10min' ? '🚨' : '🏆';
                const timeText  = timeLeft === '30min' ? '30 minutes' : timeLeft === '10min' ? '10 minutes' : 'NOW';

                const embed = new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle(`${timeEmoji} Tournament ${timeLeft === 'now' ? 'Starting NOW!' : `in ${timeText}!`}`)
                    .setDescription(timeLeft === 'now'
                        ? `**${name}** is starting! Get in the lobby NOW! 🎮`
                        : `**${name}** starts in **${timeText}**! Get ready and join the lobby.`)
                    .addFields({ name: '📋 How to Join', value: 'Check the tournament channel for bracket info and lobby details.' })
                    .setTimestamp();

                await channel.send({ content: mention, embeds: [embed] });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#22c55e').setTitle('✅ Tournament Reminder Sent').setDescription(`Posted in ${channel}`).setTimestamp()] });
                break;
            }

            // ────────────────────────────────────────────
            //  SCRIM PING
            // ────────────────────────────────────────────
            case 'scrim-ping': {
                await interaction.deferReply({ ephemeral: true });
                const channel  = interaction.options.getChannel('channel');
                const role     = interaction.options.getRole('role');
                const rankReq  = interaction.options.getString('rank') || 'All ranks';
                const teamSize = interaction.options.getString('team_size') || '3v3';
                const note     = interaction.options.getString('note');
                const time     = interaction.options.getString('time');

                const mention = role ? `<@&${role.id}>` : '@everyone';

                const embed = new EmbedBuilder()
                    .setColor('#3b82f6')
                    .setTitle('🎮 Scrims Looking!')
                    .setDescription(`${mention} — scrims are open! React or message to join.`)
                    .addFields(
                        { name: '📐 Format',    value: teamSize,  inline: true },
                        { name: '🏅 Rank Req',  value: rankReq,   inline: true },
                        { name: '🕐 Time',       value: time || 'Now / ASAP', inline: true },
                    );

                if (note) embed.addFields({ name: '📝 Note', value: note });
                embed.setFooter({ text: `Posted by ${interaction.user.tag}` }).setTimestamp();

                await channel.send({ content: mention, embeds: [embed] });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#22c55e').setTitle('✅ Scrim Ping Sent').setDescription(`Posted in ${channel}`).setTimestamp()] });
                break;
            }

            // ────────────────────────────────────────────
            //  MODERATION
            // ────────────────────────────────────────────
            case 'announce': {
                await interaction.deferReply({ ephemeral: true });
                const channel = interaction.options.getChannel('channel');
                const title   = interaction.options.getString('title');
                const message = interaction.options.getString('message');
                const color   = interaction.options.getString('color') || 'purple';
                const role    = interaction.options.getRole('role');
                const colorMap = { purple:'#9333ea', blue:'#3b82f6', green:'#22c55e', red:'#ef4444', orange:'#f97316', yellow:'#eab308', white:'#e2e8f0' };
                const embed = new EmbedBuilder().setColor(colorMap[color] || '#9333ea').setTitle(title).setDescription(message)
                    .setFooter({ text: 'Fusion Esports', iconURL: interaction.guild.iconURL() || undefined }).setTimestamp();
                const content = role ? `<@&${role.id}>` : undefined;
                await channel.send({ content, embeds: [embed] });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#22c55e').setTitle('✅ Announcement Sent').setDescription(`Posted in ${channel}`).setTimestamp()] });
                break;
            }

            case 'clear': {
                await interaction.deferReply({ ephemeral: true });
                const amount  = interaction.options.getInteger('amount');
                const channel = interaction.options.getChannel('channel') || interaction.channel;
                if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.Flags.ManageMessages)) {
                    return interaction.editReply('❌ I don\'t have Manage Messages permission in that channel.');
                }
                const deleted = await channel.bulkDelete(amount, true);
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('🗑️ Messages Cleared').setDescription(`Deleted **${deleted.size}** message${deleted.size !== 1 ? 's' : ''} in ${channel}.`).setTimestamp()] });
                break;
            }

            // ────────────────────────────────────────────
            //  XP COMMANDS
            // ────────────────────────────────────────────
            case 'rank': {
                const target  = interaction.options.getUser('user') || interaction.user;
                const xpData  = readJSON(XP_FILE);
                const uid     = target.id;
                const userXP  = xpData[uid]?.xp || 0;
                const msgs    = xpData[uid]?.messages || 0;
                const level   = getLevel(userXP);
                const current = userXP - xpForLevel(level);
                const needed  = xpForNextLevel(level) - xpForLevel(level);
                const pct     = Math.min(100, Math.floor((current / needed) * 100));
                const bar     = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));

                // Rank position
                const sorted = Object.entries(xpData).sort((a,b) => b[1].xp - a[1].xp);
                const rank   = sorted.findIndex(([id]) => id === uid) + 1;

                await interaction.reply({ embeds: [new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle(`🎮 ${target.username}'s Rank`)
                    .setThumbnail(target.displayAvatarURL())
                    .addFields(
                        { name: '⭐ Level',    value: `${level}`,        inline: true },
                        { name: '🏆 Rank',     value: `#${rank}`,        inline: true },
                        { name: '💬 Messages', value: `${msgs}`,         inline: true },
                        { name: `XP Progress  ${pct}%`, value: `\`${bar}\`\n${Math.floor(current)} / ${Math.floor(needed)} XP to Level ${level + 1}` },
                    )
                    .setTimestamp()
                ], ephemeral: false });
                break;
            }

            case 'leaderboard': {
                const xpData = readJSON(XP_FILE);
                const sorted = Object.entries(xpData)
                    .sort((a, b) => b[1].xp - a[1].xp)
                    .slice(0, 10);

                if (!sorted.length) return interaction.reply({ content: 'No XP data yet — start chatting!', ephemeral: true });

                const medals = ['🥇','🥈','🥉'];
                const lines  = await Promise.all(sorted.map(async ([uid, data], i) => {
                    const user = await client.users.fetch(uid).catch(() => null);
                    const name = user?.username || 'Unknown';
                    const lvl  = getLevel(data.xp);
                    return `${medals[i] || `**${i+1}.**`} **${name}** — Level ${lvl} (${Math.floor(data.xp)} XP)`;
                }));

                await interaction.reply({ embeds: [new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle('🏆 XP Leaderboard')
                    .setDescription(lines.join('\n'))
                    .setTimestamp()
                ] });
                break;
            }

            // ────────────────────────────────────────────
            //  FUN COMMANDS
            // ────────────────────────────────────────────
            case 'coinflip': {
                const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
                await interaction.reply({ embeds: [new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle(`🪙 ${result}!`)
                    .setDescription(`${interaction.user} flipped a coin and got **${result}**!`)
                    .setTimestamp()
                ] });
                break;
            }

            case 'poll': {
                const question = interaction.options.getString('question');
                const opt1     = interaction.options.getString('option1');
                const opt2     = interaction.options.getString('option2');
                const opt3     = interaction.options.getString('option3');
                const opt4     = interaction.options.getString('option4');

                const options  = [opt1, opt2, opt3, opt4].filter(Boolean);
                const emojis   = ['1️⃣','2️⃣','3️⃣','4️⃣'];
                const lines    = options.map((o, i) => `${emojis[i]} ${o}`).join('\n');

                const embed = new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle(`📊 ${question}`)
                    .setDescription(lines)
                    .setFooter({ text: `Poll by ${interaction.user.tag}` })
                    .setTimestamp();

                const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
                for (let i = 0; i < options.length; i++) await msg.react(emojis[i]);
                break;
            }

            // ────────────────────────────────────────────
            //  MISC
            // ────────────────────────────────────────────
            case 'set-status': {
                const text = interaction.options.getString('text');
                const type = interaction.options.getString('type') || 'watching';
                const typeMap = { watching: ActivityType.Watching, playing: ActivityType.Playing, listening: ActivityType.Listening, competing: ActivityType.Competing };
                if (!text) {
                    customStatus = null;
                    client.user.setActivity(DEFAULT_STATUSES[0].name, { type: DEFAULT_STATUSES[0].type });
                    return interaction.reply({ content: '✅ Resumed auto-rotation.', ephemeral: true });
                }
                customStatus = { text, type };
                client.user.setActivity(text, { type: typeMap[type] || ActivityType.Watching });
                await interaction.reply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Status Updated').setDescription(`Now showing: **${type} ${text}**`).setTimestamp()], ephemeral: true });
                break;
            }

            case 'server-info': {
                await interaction.deferReply();
                const guild   = interaction.guild;
                await guild.members.fetch();
                const total   = guild.memberCount;
                const bots    = guild.members.cache.filter(m => m.user.bot).size;
                const humans  = total - bots;
                const online  = guild.members.cache.filter(m =>
                    ['online','idle','dnd'].includes(m.presence?.status)
                ).size;
                const owner   = await guild.fetchOwner();
                await interaction.editReply({ embeds: [new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle(`📊 ${guild.name}`)
                    .setThumbnail(guild.iconURL({ size: 256 }) || null)
                    .addFields(
                        { name: '👑 Owner',    value: owner.user.tag,    inline: true },
                        { name: '📅 Created',  value: `<t:${Math.floor(guild.createdTimestamp/1000)}:D>`, inline: true },
                        { name: '\u200B',      value: '\u200B',          inline: true },
                        { name: '👥 Members',  value: `${humans} humans\n${bots} bots`, inline: true },
                        { name: '🟢 Online',   value: `${online}`,       inline: true },
                        { name: '💬 Channels', value: `${guild.channels.cache.size}`, inline: true },
                        { name: '🏷️ Roles',   value: `${guild.roles.cache.size - 1}`, inline: true },
                        { name: '🆔 ID',       value: guild.id,          inline: true },
                    )
                    .setFooter(online === 0 ? { text: '⚠️ Enable Presence Intent in Discord Developer Portal for live online count' } : null)
                    .setTimestamp()
                ] });
                break;
            }

            case 'welcome-setup': {
                await interaction.deferReply({ ephemeral: true });
                const channel = interaction.options.getChannel('channel');
                const message = interaction.options.getString('message');
                const wCfg    = readJSON(WELCOME_FILE);
                wCfg[interaction.guildId] = { channelId: channel.id, message };
                writeJSON(WELCOME_FILE, wCfg);
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Welcome Configured').setDescription(`Messages → ${channel}`).addFields({ name: 'Template', value: message }).setTimestamp()] });
                break;
            }

            case 'welcome-disable': {
                await interaction.deferReply({ ephemeral: true });
                const wCfg = readJSON(WELCOME_FILE);
                delete wCfg[interaction.guildId];
                writeJSON(WELCOME_FILE, wCfg);
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Welcome Disabled').setTimestamp()] });
                break;
            }

            case 'ping': {
                await interaction.reply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('🏓 Pong!').setDescription(`Latency: **${Date.now() - interaction.createdTimestamp}ms**`).setTimestamp()], ephemeral: true });
                break;
            }

            default:
                await interaction.reply({ content: '❌ Unknown command.', ephemeral: true });
        }
    } catch (error) {
        console.error('Command error:', error);
        const errEmbed = new EmbedBuilder().setColor('#ef4444').setTitle('❌ Error').setDescription(`\`${error.message}\``).setTimestamp();
        if (interaction.deferred || interaction.replied) await interaction.editReply({ embeds: [errEmbed] });
        else await interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }
});

// ═══════════════════════════════════════════════════════
//  WELCOME HANDLER
// ═══════════════════════════════════════════════════════
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        const wCfg = readJSON(WELCOME_FILE);
        const cfg  = wCfg[member.guild.id];
        if (!cfg) return;
        const channel = member.guild.channels.cache.get(cfg.channelId);
        if (!channel) return;
        const msg = cfg.message
            .replace(/{user}/g,        `<@${member.id}>`)
            .replace(/{server}/g,      member.guild.name)
            .replace(/{membercount}/g, member.guild.memberCount.toString());
        await channel.send({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('🎮 Welcome to Fusion Esports!').setDescription(msg)
            .setThumbnail(member.user.displayAvatarURL()).setFooter({ text: `Member #${member.guild.memberCount}` }).setTimestamp()] });
    } catch (err) { console.error('Welcome error:', err); }
});

client.login(process.env.DISCORD_TOKEN);