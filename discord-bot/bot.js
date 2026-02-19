import { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Events } from 'discord.js';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers, // Required for welcome messages
    ]
});

// Welcome message storage
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

// Admin check
function isAdmin(userId) {
    const adminIds = process.env.ADMIN_IDS?.split(',').map(id => id.trim()) || [];
    return adminIds.includes(userId);
}

// Update website configuration
async function updateWebsiteConfig(updates) {
    try {
        const response = await fetch(process.env.WEBSITE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bot-Token': process.env.BOT_SECRET_TOKEN
            },
            body: JSON.stringify(updates)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update website');
        }

        return data;
    } catch (error) {
        console.error('Error updating website:', error);
        throw error;
    }
}

// Get current config
async function getCurrentConfig() {
    try {
        const websiteUrl = process.env.WEBSITE_API_URL.replace('/update-config', '/get-config');
        const response = await fetch(websiteUrl);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching config:', error);
        return null;
    }
}

const statuses = [
    { name: 'Rocket League', type: 3 }, // Watching
    { name: 'the Community', type: 3 },
    { name: 'Fusion Esports', type: 3 },
    { name: 'for new members', type: 3 }
];

let currentStatusIndex = 0;

client.on('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`🌐 Managing website at: ${process.env.WEBSITE_API_URL}`);
    
    // Set initial status
    client.user.setActivity(statuses[0].name, { type: statuses[0].type });
    
    // Rotate status every 5 minutes
    setInterval(() => {
        currentStatusIndex = (currentStatusIndex + 1) % statuses.length;
        client.user.setActivity(statuses[currentStatusIndex].name, { type: statuses[currentStatusIndex].type });
    }, 5 * 60 * 1000); // 5 minutes
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // Check if user is admin
    if (!isAdmin(interaction.user.id)) {
        return interaction.reply({
            content: '❌ You do not have permission to use this command.',
            ephemeral: true
        });
    }

    try {
        switch (interaction.commandName) {
            case 'set-members': {
                await interaction.deferReply({ ephemeral: true });
                
                const count = interaction.options.getString('count');
                
                await updateWebsiteConfig({ memberCount: count });
                
                const embed = new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle('✅ Member Count Updated')
                    .setDescription(`The website now displays **${count}** total members.`)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'set-discord': {
                await interaction.deferReply({ ephemeral: true });
                
                const url = interaction.options.getString('url');
                
                // Validate Discord invite URL
                if (!url.includes('discord.gg/') && !url.includes('discord.com/invite/')) {
                    return interaction.editReply('❌ Invalid Discord invite URL.');
                }
                
                await updateWebsiteConfig({ discordUrl: url });
                
                const embed = new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle('✅ Discord URL Updated')
                    .setDescription(`Website Discord invite updated to:\n${url}`)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'set-tournament': {
                await interaction.deferReply({ ephemeral: true });
                
                const day = interaction.options.getInteger('day');
                const hour = interaction.options.getInteger('hour');
                const minute = interaction.options.getInteger('minute');
                const name = interaction.options.getString('name');
                const upcomingCount = interaction.options.getInteger('upcoming_count');
                
                const updates = {
                    tournament: {}
                };
                
                if (day !== null) updates.tournament.dayOfWeek = day;
                if (hour !== null) updates.tournament.hour = hour;
                if (minute !== null) updates.tournament.minute = minute;
                if (name) updates.tournament.name = name;
                if (upcomingCount !== null) updates.tournament.upcomingCount = upcomingCount;
                
                await updateWebsiteConfig(updates);
                
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const dayName = day !== null ? days[day] : 'unchanged';
                const timeStr = hour !== null && minute !== null ? 
                    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} UK Time` : 
                    'unchanged';
                
                const embed = new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle('✅ Tournament Schedule Updated')
                    .addFields(
                        { name: 'Day', value: dayName, inline: true },
                        { name: 'Time', value: timeStr, inline: true },
                        { name: 'Name', value: name || 'unchanged', inline: true },
                        { name: 'Upcoming Shown', value: upcomingCount !== null ? `${upcomingCount} dates` : 'unchanged', inline: true }
                    )
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'add-social': {
                await interaction.deferReply({ ephemeral: true });
                
                const platform = interaction.options.getString('platform');
                const name = interaction.options.getString('name');
                const description = interaction.options.getString('description');
                const url = interaction.options.getString('url');
                
                // Get current config
                const currentConfig = await getCurrentConfig();
                
                // Add new social
                const socials = currentConfig?.socials || [];
                socials.push({ platform, name, desc: description, url });
                
                await updateWebsiteConfig({ socials });
                
                const embed = new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle('✅ Social Card Added')
                    .addFields(
                        { name: 'Platform', value: platform, inline: true },
                        { name: 'Name', value: name, inline: true },
                        { name: 'Description', value: description },
                        { name: 'URL', value: url }
                    )
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'remove-social': {
                await interaction.deferReply({ ephemeral: true });
                
                const name = interaction.options.getString('name');
                
                // Get current config
                const currentConfig = await getCurrentConfig();
                
                // Remove social by name
                const socials = (currentConfig?.socials || []).filter(s => s.name !== name);
                
                if (socials.length === (currentConfig?.socials || []).length) {
                    return interaction.editReply(`❌ No social card found with name: ${name}`);
                }
                
                await updateWebsiteConfig({ socials });
                
                const embed = new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle('✅ Social Card Removed')
                    .setDescription(`Removed social card: **${name}**`)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'view-config': {
                await interaction.deferReply({ ephemeral: true });
                
                const config = await getCurrentConfig();
                
                if (!config) {
                    return interaction.editReply('❌ Failed to fetch current configuration.');
                }
                
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const dayName = days[config.tournament?.dayOfWeek] || 'Saturday';
                const time = `${String(config.tournament?.hour || 18).padStart(2, '0')}:${String(config.tournament?.minute || 0).padStart(2, '0')}`;
                
                const socialsText = (config.socials || [])
                    .map((s, i) => `${i + 1}. **${s.name}** (${s.platform})`)
                    .join('\n') || 'None';
                
                const embed = new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle('📋 Current Website Configuration')
                    .addFields(
                        { name: '👥 Members', value: config.memberCount || 'auto', inline: true },
                        { name: '🟢 Online', value: config.onlineCount || 'auto', inline: true },
                        { name: '🔗 Discord', value: config.discordUrl || 'Not set', inline: false },
                        { name: '🏆 Tournament', value: `**${config.tournament?.name || 'Fusion Weekly'}**\n${dayName} at ${time} UK Time`, inline: false },
                        { name: '📱 Social Cards', value: socialsText, inline: false }
                    )
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'welcome-setup': {
                await interaction.deferReply({ ephemeral: true });
                
                const channel = interaction.options.getChannel('channel');
                const message = interaction.options.getString('message');
                
                const welcomeConfig = getWelcomeConfig();
                welcomeConfig[interaction.guildId] = {
                    channelId: channel.id,
                    message: message
                };
                saveWelcomeConfig(welcomeConfig);
                
                const embed = new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle('✅ Welcome Messages Configured')
                    .setDescription(`Welcome messages will be sent to ${channel}`)
                    .addFields(
                        { name: 'Message Template', value: message }
                    )
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'welcome-disable': {
                await interaction.deferReply({ ephemeral: true });
                
                const welcomeConfig = getWelcomeConfig();
                delete welcomeConfig[interaction.guildId];
                saveWelcomeConfig(welcomeConfig);
                
                const embed = new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle('✅ Welcome Messages Disabled')
                    .setDescription('Welcome messages have been turned off.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'ping': {
                const embed = new EmbedBuilder()
                    .setColor('#9333ea')
                    .setTitle('🏓 Pong!')
                    .setDescription(`Bot is online and ready!\nLatency: ${Date.now() - interaction.createdTimestamp}ms`)
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            }

            default:
                await interaction.reply({
                    content: '❌ Unknown command.',
                    ephemeral: true
                });
        }
    } catch (error) {
        console.error('Error handling command:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('❌ Error')
            .setDescription(`Failed to execute command: ${error.message}`)
            .setTimestamp();
        
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
});

// Welcome message handler
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        const welcomeConfig = getWelcomeConfig();
        const config = welcomeConfig[member.guild.id];
        
        if (!config) return; // Welcome messages not configured
        
        const channel = member.guild.channels.cache.get(config.channelId);
        if (!channel) return; // Channel not found
        
        // Replace placeholders
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

// Keep-alive mechanism (optional, for free hosting services)
if (process.env.KEEP_ALIVE === 'true') {
    setInterval(() => {
        console.log('⏰ Keep-alive ping');
    }, 5 * 60 * 1000); // Every 5 minutes
}

// Login
client.login(process.env.DISCORD_TOKEN);