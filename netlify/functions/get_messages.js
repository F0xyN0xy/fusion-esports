export const handler = async (event) => {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const { channelId, limit = 50 } = event.queryStringParameters || {};

    if (!channelId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'channelId is required' }),
        };
    }

    try {
        const response = await fetch(
            `https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`,
            {
                headers: { Authorization: `Bot ${BOT_TOKEN}` },
            }
        );

        if (!response.ok) {
            throw new Error(`Discord API error: ${response.status}`);
        }

        const messages = await response.json();

        const formatted = messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            author: msg.author.username,
            authorId: msg.author.id,
            avatar: msg.author.avatar
                ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
                : null,
            timestamp: msg.timestamp,
            isBot: msg.author.bot || false,
        }));

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(formatted),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message }),
        };
    }
};