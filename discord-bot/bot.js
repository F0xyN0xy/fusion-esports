import { Client, GatewayIntentBits, EmbedBuilder, Events } from 'discord.js';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
    ]
});

const WELCOME_CONFIG_FILE = './welcome-config.json';

function getWelcomeConfig() {
    if (existsSync(WELCOME_CONFIG_FILE)) {
        return JSON.parse(readFileSync(WELCOME_CONFIG_FILE, 'utf8'));
    }
    return {};
}

function saveWelcomeConfig(config) {
    writeFileSync(WELCOME_CONFIG_FILE, JSON.stringify(config, null, 2));
}

function isAdmin(userId) {
    const adminIds = process.env.ADMIN_IDS?.split(',').map(id => id.trim()) || [];
    return adminIds.includes(userId);
}

async function updateWebsiteConfig(updates) {
    const token = process.env.BOT_SECRET_TOKEN;
    const apiUrl = process.env.WEBSITE_API_URL;

    if (!token) throw new Error('BOT_SECRET_TOKEN is missing from .env — add it and restart the bot.');
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
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('Error fetching config:', error);
        return null;
    }
}

const statuses = [
    { name: 'Rocket League', type: 3 },
    { name: 'the Community', type: 3 },
    { name: 'Fusion Esports', type: 3 },
    { name: 'for new members', type: 3 }
];
let currentStatusIndex = 0;

client.on('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`🌐 Website API: ${process.env.WEBSITE_API_URL || '⚠️  WEBSITE_API_URL not set!'}`);
    if (!process.env.BOT_SECRET_TOKEN) console.warn('⚠️  BOT_SECRET_TOKEN not set — website commands will fail!');

    client.user.setActivity(statuses[0].name, { type: statuses[0].type });
    setInterval(() => {
        currentStatusIndex = (currentStatusIndex + 1) % statuses.length;
        client.user.setActivity(statuses[currentStatusIndex].name, { type: statuses[currentStatusIndex].type });
    }, 5 * 60 * 1000);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (!isAdmin(interaction.user.id)) {
        return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
    }

    try {
        switch (interaction.commandName) {
            case 'set-members': {
                await interaction.deferReply({ ephemeral: true });
                const count = interaction.options.getString('count');
                await updateWebsiteConfig({ memberCount: count });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Member Count Updated').setDescription(`The website now displays **${count}** total members.`).setTimestamp()] });
                break;
            }
            case 'set-discord': {
                await interaction.deferReply({ ephemeral: true });
                const url = interaction.options.getString('url');
                if (!url.includes('discord.gg/') && !url.includes('discord.com/invite/')) {
                    return interaction.editReply('❌ Invalid Discord invite URL.');
                }
                await updateWebsiteConfig({ discordUrl: url });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Discord URL Updated').setDescription(`Website Discord invite updated to:\n${url}`).setTimestamp()] });
                break;
            }
            case 'set-tournament': {
                await interaction.deferReply({ ephemeral: true });
                const day = interaction.options.getInteger('day');
                const hour = interaction.options.getInteger('hour');
                const minute = interaction.options.getInteger('minute');
                const name = interaction.options.getString('name');
                const upcomingCount = interaction.options.getInteger('upcoming_count');
                const updates = { tournament: {} };
                if (day !== null) updates.tournament.dayOfWeek = day;
                if (hour !== null) updates.tournament.hour = hour;
                if (minute !== null) updates.tournament.minute = minute;
                if (name) updates.tournament.name = name;
                if (upcomingCount !== null) updates.tournament.upcomingCount = upcomingCount;
                await updateWebsiteConfig(updates);
                const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Tournament Schedule Updated').addFields(
                    { name: 'Day', value: day !== null ? days[day] : 'unchanged', inline: true },
                    { name: 'Time', value: hour !== null && minute !== null ? `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} UK Time` : 'unchanged', inline: true },
                    { name: 'Name', value: name || 'unchanged', inline: true },
                    { name: 'Upcoming Shown', value: upcomingCount !== null ? `${upcomingCount} dates` : 'unchanged', inline: true }
                ).setTimestamp()] });
                break;
            }
            case 'add-social': {
                await interaction.deferReply({ ephemeral: true });
                const platform = interaction.options.getString('platform');
                const name = interaction.options.getString('name');
                const description = interaction.options.getString('description');
                const url = interaction.options.getString('url');
                const currentConfig = await getCurrentConfig();
                const socials = currentConfig?.socials || [];
                socials.push({ platform, name, desc: description, url });
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
                const socials = (currentConfig?.socials || []).filter(s => s.name !== name);
                if (socials.length === (currentConfig?.socials || []).length) {
                    return interaction.editReply(`❌ No social card found with name: ${name}`);
                }
                await updateWebsiteConfig({ socials });
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Social Card Removed').setDescription(`Removed social card: **${name}**`).setTimestamp()] });
                break;
            }
            case 'view-config': {
                await interaction.deferReply({ ephemeral: true });
                const config = await getCurrentConfig();
                if (!config) return interaction.editReply('❌ Failed to fetch current configuration.');
                const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                const socialsText = (config.socials || []).map((s, i) => `${i + 1}. **${s.name}** (${s.platform})`).join('\n') || 'None';
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('📋 Current Website Configuration').addFields(
                    { name: '👥 Members', value: config.memberCount || 'auto', inline: true },
                    { name: '🟢 Online', value: config.onlineCount || 'auto', inline: true },
                    { name: '🔗 Discord', value: config.discordUrl || 'Not set', inline: false },
                    { name: '🏆 Tournament', value: `**${config.tournament?.name || 'Fusion Weekly'}**\n${days[config.tournament?.dayOfWeek] || 'Saturday'} at ${String(config.tournament?.hour || 18).padStart(2,'0')}:${String(config.tournament?.minute || 0).padStart(2,'0')} UK Time`, inline: false },
                    { name: '📱 Social Cards', value: socialsText, inline: false }
                ).setTimestamp()] });
                break;
            }
            case 'welcome-setup': {
                await interaction.deferReply({ ephemeral: true });
                const channel = interaction.options.getChannel('channel');
                const message = interaction.options.getString('message');
                const welcomeConfig = getWelcomeConfig();
                welcomeConfig[interaction.guildId] = { channelId: channel.id, message };
                saveWelcomeConfig(welcomeConfig);
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Welcome Messages Configured').setDescription(`Welcome messages will be sent to ${channel}`).addFields({ name: 'Message Template', value: message }).setTimestamp()] });
                break;
            }
            case 'welcome-disable': {
                await interaction.deferReply({ ephemeral: true });
                const welcomeConfig = getWelcomeConfig();
                delete welcomeConfig[interaction.guildId];
                saveWelcomeConfig(welcomeConfig);
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('✅ Welcome Messages Disabled').setDescription('Welcome messages have been turned off.').setTimestamp()] });
                break;
            }
            case 'ping': {
                await interaction.reply({ embeds: [new EmbedBuilder().setColor('#9333ea').setTitle('🏓 Pong!').setDescription(`Bot is online!\nLatency: ${Date.now() - interaction.createdTimestamp}ms`).setTimestamp()], ephemeral: true });
                break;
            }
            default:
                await interaction.reply({ content: '❌ Unknown command.', ephemeral: true });
        }
    } catch (error) {
        console.error('Error handling command:', error);
        const errorEmbed = new EmbedBuilder().setColor('#ef4444').setTitle('❌ Error').setDescription(`Failed to execute command: ${error.message}`).setTimestamp();
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
});

client.on(Events.GuildMemberAdd, async (member) => {
    try {
        const welcomeConfig = getWelcomeConfig();
        const config = welcomeConfig[member.guild.id];
        if (!config) return;
        const channel = member.guild.channels.cache.get(config.channelId);
        if (!channel) return;
        let message = config.message
            .replace(/{user}/g, `<@${member.id}>`)
            .replace(/{server}/g, member.guild.name)
            .replace(/{membercount}/g, member.guild.memberCount.toString());
        const embed = new EmbedBuilder()
            .setColor('#9333ea')
            .setTitle('🎮 Welcome to Fusion Esports!')
            .setDescription(message)
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ text: `Member #${member.guild.memberCount}` })
            .setTimestamp();
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
});

client.login(process.env.DISCORD_TOKEN);