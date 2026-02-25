export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

  try {
    const { channelId, message, username, userId, avatar } = JSON.parse(event.body);

    if (!channelId || !message) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'channelId and message are required' }),
      };
    }

    // Create a nice embed for app messages
    const embed = {
      author: {
        name: username || 'Unknown User',
        icon_url: avatar || null,
      },
      description: message,
      color: 0x6C63FF, // Fusion Esports purple
      footer: {
        text: 'Sent via Fusion Esports App',
      },
      timestamp: new Date().toISOString(),
    };

    // Send as embed (looks better) or regular message
    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
          // Also include plain text for notifications
          content: `**${username}** via App: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Discord API error: ${response.status}`);
    }

    const result = await response.json();

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: true, 
        messageId: result.id,
        timestamp: result.timestamp,
      }),
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};