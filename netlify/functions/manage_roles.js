export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const GUILD_ID = '1303027633679896608';

  try {
    const { userId, roleId, action } = JSON.parse(event.body);

    if (!userId || !roleId || !action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId, roleId or action' }),
      };
    }

    const url = `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}/roles/${roleId}`;
    const response = await fetch(url, {
      method: action === 'add' ? 'PUT' : 'DELETE',
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok && response.status !== 204) {
      const error = await response.json();
      throw new Error(error.message || 'Discord API error');
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};