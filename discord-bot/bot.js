import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { config } from 'dotenv';
import http from 'http';
config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ]
});

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

client.on('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`🌐 Managing website at: ${process.env.WEBSITE_API_URL}`);
    console.log(`🔗 Render URL: ${process.env.RENDER_EXTERNAL_URL || 'Not detected'}`);
    
    // Set bot status
    client.user.setActivity('Fusion Esports', { type: 3 }); // 3 = Watching
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
                
                const updates = {
                    tournament: {}
                };
                
                if (day !== null) updates.tournament.dayOfWeek = day;
                if (hour !== null) updates.tournament.hour = hour;
                if (minute !== null) updates.tournament.minute = minute;
                if (name) updates.tournament.name = name;
                
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
                        { name: 'Name', value: name || 'unchanged', inline: true }
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

// ═══════════════════════════════════════════════════════
//  HEALTH CHECK SERVER - Keeps Render service awake
// ═══════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            bot: client.user?.tag || 'starting',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()) + 's',
            render: process.env.RENDER_EXTERNAL_URL || 'unknown'
        }));
    } else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Fusion Bot Status</title>
                <style>
                    body { font-family: system-ui; background: #0d1120; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    .status { text-align: center; padding: 40px; border: 2px solid #9333ea; border-radius: 20px; background: rgba(147,51,234,0.1); }
                    h1 { margin: 0 0 10px; color: #a855f7; }
                    .online { color: #22c55e; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="status">
                    <h1>🤖 Fusion Bot</h1>
                    <p>Status: <span class="online">ONLINE</span></p>
                    <p>Logged in as: ${client.user?.tag || 'Starting...'}</p>
                    <p>Uptime: ${Math.floor(process.uptime())} seconds</p>
                </div>
            </html>
        `);
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`🌐 Health server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🏠 Status page: http://localhost:${PORT}/`);
    
    if (process.env.RENDER_EXTERNAL_URL) {
        console.log(`🔗 Your Render URL: ${process.env.RENDER_EXTERNAL_URL}`);
        console.log(`🔗 Health endpoint: ${process.env.RENDER_EXTERNAL_URL}/health`);
        console.log(`🔗 Status page: ${process.env.RENDER_EXTERNAL_URL}/`);
    }
});

// Self-ping to prevent idle (backup in case UptimeRobot fails)
if (process.env.RENDER_EXTERNAL_URL) {
    const selfUrl = process.env.RENDER_EXTERNAL_URL + '/health';
    
    setInterval(async () => {
        try {
            const response = await fetch(selfUrl);
            const data = await response.json();
            console.log(`🔄 Self-ping: ${data.status} | Uptime: ${data.uptime}`);
        } catch (e) {
            console.log('⚠️ Self-ping failed:', e.message);
        }
    }, 4 * 60 * 1000); // Every 4 minutes
}

// Login to Discord
client.login(process.env.DISCORD_TOKEN);