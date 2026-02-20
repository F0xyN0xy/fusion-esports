import { Client, GatewayIntentBits, EmbedBuilder, Events, PermissionsBitField, ActivityType } from 'discord.js';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ]
});

const WELCOME_CONFIG_FILE = './welcome-config.json';

function getWelcomeConfig() {
    if (existsSync(WELCOME_CONFIG_FILE)) {
        return JSON.parse(readFileSync(WELCOME_CONFIG_FILE, 'utf8'));
    }
    return {};
}
function saveWelcomeConfig(cfg) {
    writeFileSync(WELCOME_CONFIG_FILE, JSON.stringify(cfg, null, 2));
}
function isAdmin(userId) {
    const adminIds = process.env.ADMIN_IDS?.split(',').map(id => id.trim()) || [];
    return adminIds.includes(userId);
}

async function updateWebsiteConfig(updates) {
    const token  = process.env.BOT_SECRET_TOKEN;
    const apiUrl = process.env.WEBSITE_API_URL;
    if (!token)  throw new Error('BOT_SECRET_TOKEN is missing from .env — add it and restart the bot.');
    if (!apiUrl) throw new Error('WEBSITE_API_URL is missing from .env — add it and restart the bot.');
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Bot-Token': token },
        body: JSON.stringify(updates)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update website');
    return data;
}

async function getCurrentConfig() {
    try {
        const apiUrl = process.env.WEBSITE_API_URL;
        if (!apiUrl) throw new Error('WEBSITE_API_URL not set');
        const url = apiUrl.replace('/update-config', '/get-config');
        return await (await fetch(url)).json();
    } catch (err) {
        console.error('Error fetching config:', err);
        return null;
    }
}

// ── Status rotation ──────────────────────────────────────
const DEFAULT_STATUSES = [
    { name: 'Rocket League', type: ActivityType.Watching },
    { name: 'the Community', type: ActivityType.Watching },
    { name: 'Fusion Esports', type: ActivityType.Watching },
    { name: 'for new members', type: ActivityType.Watching },
];
let currentStatusIndex = 0;
let customStatus = null; // { text, type } when set manually

function rotateStatus() {
    if (customStatus) return; // don't rotate if manually set
    currentStatusIndex = (currentStatusIndex + 1) % DEFAULT_STATUSES.length;
    const s = DEFAULT_STATUSES[currentStatusIndex];
    client.user.setActivity(s.name, { type: s.type });
}

client.on('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`🌐 Website API: ${process.env.WEBSITE_API_URL || '⚠️  WEBSITE_API_URL not set!'}`);
    if (!process.env.BOT_SECRET_TOKEN) console.warn('⚠️  BOT_SECRET_TOKEN not set — website commands will fail!');

    client.user.setActivity(DEFAULT_STATUSES[0].name, { type: DEFAULT_STATUSES[0].type });
    setInterval(rotateStatus, 5 * 60 * 1000);
});

// ── Interaction handler ──────────────────────────────────
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (!isAdmin(interaction.user.id)) {
        return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
    }

    try {
        switch (interaction.commandName) {

            // ── Website commands ─────────────────────────
            case 'set-members': {
                await interaction.deferReply({ ephemeral: true });
                const count = interaction.options.getString('count');
                await updateWebsiteConfig({ memberCount: count });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Member Count Updated').setDescription(`Website now shows **${count}** total members.`).setTimestamp()] });
                break;
            }

            case 'set-online': {
                await interaction.deferReply({ ephemeral: true });
                const count = interaction.options.getString('count');
                const isAuto = !count || count.toLowerCase() === 'auto';
                await updateWebsiteConfig({ onlineCount: isAuto ? 'auto' : count });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Online Count Updated').setDescription(isAuto ? 'Online count will now be fetched live from Discord widget.' : `Website now shows **${count}** online.`).setTimestamp()] });
                break;
            }

            case 'set-discord': {
                await interaction.deferReply({ ephemeral: true });
                const url = interaction.options.getString('url');
                if (!url.includes('discord.gg/') && !url.includes('discord.com/invite/')) {
                    return interaction.editReply('❌ Invalid Discord invite URL.');
                }
                await updateWebsiteConfig({ discordUrl: url });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Discord URL Updated').setDescription(`Invite link updated to:\n${url}`).setTimestamp()] });
                break;
            }

            case 'set-tournament': {
                await interaction.deferReply({ ephemeral: true });
                const day          = interaction.options.getInteger('day');
                const hour         = interaction.options.getInteger('hour');
                const minute       = interaction.options.getInteger('minute');
                const name         = interaction.options.getString('name');
                const upcomingCount = interaction.options.getInteger('upcoming_count');
                const updates = { tournament: {} };
                if (day !== null)          updates.tournament.dayOfWeek     = day;
                if (hour !== null)         updates.tournament.hour          = hour;
                if (minute !== null)       updates.tournament.minute        = minute;
                if (name)                  updates.tournament.name          = name;
                if (upcomingCount !== null) updates.tournament.upcomingCount = upcomingCount;
                await updateWebsiteConfig(updates);
                const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Tournament Schedule Updated').addFields(
                    { name: 'Day',    value: day    !== null ? DAYS[day] : 'unchanged', inline: true },
                    { name: 'Time',   value: hour   !== null && minute !== null ? `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} UK` : 'unchanged', inline: true },
                    { name: 'Name',   value: name   || 'unchanged', inline: true },
                    { name: 'Showing', value: upcomingCount !== null ? `${upcomingCount} dates` : 'unchanged', inline: true }
                ).setTimestamp()] });
                break;
            }

            case 'add-social': {
                await interaction.deferReply({ ephemeral: true });
                const platform    = interaction.options.getString('platform');
                const name        = interaction.options.getString('name');
                const description = interaction.options.getString('description');
                const url         = interaction.options.getString('url');
                const currentConfig = await getCurrentConfig();
                const socials = [...(currentConfig?.socials || []), { platform, name, desc: description, url }];
                await updateWebsiteConfig({ socials });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Social Card Added').addFields(
                    { name: 'Platform', value: platform, inline: true },
                    { name: 'Name', value: name, inline: true },
                    { name: 'Description', value: description },
                    { name: 'URL', value: url }
                ).setTimestamp()] });
                break;
            }

            case 'remove-social': {
                await interaction.deferReply({ ephemeral: true });
                const name = interaction.options.getString('name');
                const currentConfig = await getCurrentConfig();
                const before = currentConfig?.socials || [];
                const socials = before.filter(s => s.name !== name);
                if (socials.length === before.length) return interaction.editReply(`❌ No social card found with name: **${name}**`);
                await updateWebsiteConfig({ socials });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Social Card Removed').setDescription(`Removed: **${name}**`).setTimestamp()] });
                break;
            }

            case 'view-config': {
                await interaction.deferReply({ ephemeral: true });
                const cfg = await getCurrentConfig();
                if (!cfg) return interaction.editReply('❌ Failed to fetch configuration.');
                const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                const socialsText = (cfg.socials || []).map((s, i) => `${i+1}. **${s.name}** (${s.platform})`).join('\n') || 'None';
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('📋 Website Configuration').addFields(
                    { name: '👥 Members',    value: cfg.memberCount || 'auto', inline: true },
                    { name: '🟢 Online',     value: cfg.onlineCount || 'auto', inline: true },
                    { name: '🔗 Discord',    value: cfg.discordUrl  || 'Not set', inline: false },
                    { name: '🏆 Tournament', value: `**${cfg.tournament?.name || 'Fusion Weekly'}**\n${DAYS[cfg.tournament?.dayOfWeek] || 'Saturday'} at ${String(cfg.tournament?.hour||18).padStart(2,'0')}:${String(cfg.tournament?.minute||0).padStart(2,'0')} UK`, inline: false },
                    { name: '📱 Socials',    value: socialsText, inline: false }
                ).setTimestamp()] });
                break;
            }

            // ── Announce ─────────────────────────────────
            case 'announce': {
                await interaction.deferReply({ ephemeral: true });
                const channel = interaction.options.getChannel('channel');
                const title   = interaction.options.getString('title');
                const message = interaction.options.getString('message');
                const color   = interaction.options.getString('color') || 'purple';

                const colorMap = {
                    purple: '#9333ea', blue: '#3b82f6', green: '#22c55e',
                    red: '#ef4444', orange: '#f97316', yellow: '#eab308', white: '#e2e8f0'
                };

                const embed = new EmbedBuilder()
                    .setColor(colorMap[color] || '#9333ea')
                    .setTitle(title)
                    .setDescription(message)
                    .setFooter({ text: 'Fusion Esports', iconURL: interaction.guild.iconURL() || undefined })
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#22c55e').setTitle('✅ Announcement Sent').setDescription(`Posted in ${channel}`).setTimestamp()] });
                break;
            }

            // ── Clear messages ───────────────────────────
            case 'clear': {
                await interaction.deferReply({ ephemeral: true });
                const amount  = interaction.options.getInteger('amount');
                const channel = interaction.options.getChannel('channel') || interaction.channel;

                if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.Flags.ManageMessages)) {
                    return interaction.editReply('❌ I don\'t have **Manage Messages** permission in that channel.');
                }

                const deleted = await channel.bulkDelete(amount, true); // true = skip messages > 14 days
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('🗑️ Messages Cleared').setDescription(`Deleted **${deleted.size}** message${deleted.size !== 1 ? 's' : ''} in ${channel}.\n\n*Note: Messages older than 14 days can't be bulk deleted.*`).setTimestamp()] });
                break;
            }

            // ── Server info ──────────────────────────────
            case 'server-info': {
                await interaction.deferReply({ ephemeral: false }); // visible to everyone
                const guild = interaction.guild;
                await guild.members.fetch();

                const totalMembers  = guild.memberCount;
                const botCount      = guild.members.cache.filter(m => m.user.bot).size;
                const humanCount    = totalMembers - botCount;
                const onlineCount   = guild.members.cache.filter(m => m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd').size;
                const channelCount  = guild.channels.cache.size;
                const roleCount     = guild.roles.cache.size - 1; // exclude @everyone
                const created       = `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`;
                const owner         = await guild.fetchOwner();

                const embed = new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle(`📊 ${guild.name}`)
                    .setThumbnail(guild.iconURL({ size: 256 }) || null)
                    .addFields(
                        { name: '👑 Owner',     value: `${owner.user.tag}`, inline: true },
                        { name: '📅 Created',   value: created,             inline: true },
                        { name: '\u200B',       value: '\u200B',            inline: true },
                        { name: '👥 Members',   value: `${humanCount} humans\n${botCount} bots`, inline: true },
                        { name: '🟢 Online',    value: `${onlineCount}`,    inline: true },
                        { name: '💬 Channels',  value: `${channelCount}`,   inline: true },
                        { name: '🏷️ Roles',    value: `${roleCount}`,      inline: true },
                        { name: '🆔 Server ID', value: guild.id,            inline: true },
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            // ── Set bot status ───────────────────────────
            case 'set-status': {
                const text   = interaction.options.getString('text');
                const type   = interaction.options.getString('type') || 'watching';
                const typeMap = {
                    watching:  ActivityType.Watching,
                    playing:   ActivityType.Playing,
                    listening: ActivityType.Listening,
                    competing: ActivityType.Competing,
                };
                customStatus = { text, type };
                client.user.setActivity(text, { type: typeMap[type] || ActivityType.Watching });
                await interaction.reply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Bot Status Updated').setDescription(`Now showing: **${type} ${text}**\n\nUse \`/set-status\` with empty text to resume auto-rotation.`).setTimestamp()], ephemeral: true });
                break;
            }

            // ── Welcome ──────────────────────────────────
            case 'welcome-setup': {
                await interaction.deferReply({ ephemeral: true });
                const channel = interaction.options.getChannel('channel');
                const message = interaction.options.getString('message');
                const wCfg    = getWelcomeConfig();
                wCfg[interaction.guildId] = { channelId: channel.id, message };
                saveWelcomeConfig(wCfg);
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Welcome Messages Configured').setDescription(`Messages will go to ${channel}`).addFields({ name: 'Template', value: message }).setTimestamp()] });
                break;
            }

            case 'welcome-disable': {
                await interaction.deferReply({ ephemeral: true });
                const wCfg = getWelcomeConfig();
                delete wCfg[interaction.guildId];
                saveWelcomeConfig(wCfg);
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Welcome Messages Disabled').setTimestamp()] });
                break;
            }

            // ── Ping ─────────────────────────────────────
            case 'ping': {
                await interaction.reply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('🏓 Pong!').setDescription(`Latency: **${Date.now() - interaction.createdTimestamp}ms**`).setTimestamp()], ephemeral: true });
                break;
            }

            default:
                await interaction.reply({ content: '❌ Unknown command.', ephemeral: true });
        }
    } catch (error) {
        console.error('Error handling command:', error);
        const errEmbed = new EmbedBuilder().setColor('#ef4444').setTitle('❌ Error').setDescription(`Failed to execute command:\n\`${error.message}\``).setTimestamp();
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ embeds: [errEmbed] });
        } else {
            await interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }
    }
});

// ── Welcome member handler ───────────────────────────────
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        const wCfg = getWelcomeConfig();
        const cfg  = wCfg[member.guild.id];
        if (!cfg) return;
        const channel = member.guild.channels.cache.get(cfg.channelId);
        if (!channel) return;
        const message = cfg.message
            .replace(/{user}/g,        `<@${member.id}>`)
            .replace(/{server}/g,      member.guild.name)
            .replace(/{membercount}/g, member.guild.memberCount.toString());
        await channel.send({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('🎮 Welcome to Fusion Esports!').setDescription(message).setThumbnail(member.user.displayAvatarURL()).setFooter({ text: `Member #${member.guild.memberCount}` }).setTimestamp()] });
    } catch (err) {
        console.error('Error sending welcome message:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);
