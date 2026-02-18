import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';

let client = null;
let isReady = false;

// Singleton client for serverless
function getClient() {
    if (!client) {
        client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
        });
        
        client.once('ready', () => {
            console.log(`✅ Bot logged in as ${client.user.tag}`);
            isReady = true;
            client.user.setActivity('Fusion Esports', { type: 3 });
        });
        
        client.login(process.env.DISCORD_TOKEN);
    }
    return client;
}

// Netlify Function handler for interactions
export const handler = async (event, context) => {
    const headers = {
        "Content-Type": "application/json"
    };

    try {
        const bot = getClient();
        
        // Wait for ready if needed
        if (!isReady) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Parse Discord interaction
        const interaction = JSON.parse(event.body);
        
        // Handle verification (Discord requires this)
        if (interaction.type === 1) {
            return { statusCode: 200, headers, body: JSON.stringify({ type: 1 }) };
        }

        // Process command
        const { commandName, options, user } = interaction;
        
        // Admin check
        const adminIds = process.env.ADMIN_IDS?.split(',') || [];
        if (!adminIds.includes(user.id)) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    type: 4,
                    data: {
                        content: '❌ You do not have permission to use this command.',
                        flags: 64
                    }
                })
            };
        }

        let response = { content: 'Unknown command' };

        switch (commandName) {
            case 'set-members': {
                const count = options.find(o => o.name === 'count')?.value;
                
                // Call update-config function internally
                await fetch(`${process.env.URL}/.netlify/functions/update-config`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Bot-Token': process.env.BOT_SECRET_TOKEN
                    },
                    body: JSON.stringify({ memberCount: count })
                });

                response = {
                    embeds: [{
                        title: '✅ Member Count Updated',
                        description: `Website now displays **${count}** total members.`,
                        color: 0x9333ea,
                        timestamp: new Date().toISOString()
                    }]
                };
                break;
            }
            // ... other commands
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                type: 4,
                data: response
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                type: 4,
                data: {
                    content: `❌ Error: ${error.message}`,
                    flags: 64
                }
            })
        };
    }
};