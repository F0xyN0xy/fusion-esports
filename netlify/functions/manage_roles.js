export const handler = async (event) => {
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
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const GUILD_ID = '1303027633679896608';

  try {
    const body = JSON.parse(event.body);
    const { userId, roleId, action } = body;

    if (!userId || !roleId || !action) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing fields', received: body }),
      };
    }

    const url = `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}/roles/${roleId}`;
    const discordResponse = await fetch(url, {
      method: action === 'add' ? 'PUT' : 'DELETE',
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    // Log what Discord returned
    const discordStatus = discordResponse.status;
    let discordBody = '';
    try { discordBody = await discordResponse.text(); } catch (_) {}

    if (discordStatus !== 204 && !discordResponse.ok) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          error: 'Discord API error', 
          status: discordStatus,
          discord_response: discordBody,
          bot_token_set: !!BOT_TOKEN,
          url_called: url,
        }),
      };
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