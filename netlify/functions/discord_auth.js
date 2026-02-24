const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { code } = event.queryStringParameters || {};
  const CLIENT_ID = '1473722302968631588';
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

  if (!code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No code provided' }),
    };
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || 'Token exchange failed');
    }

    // Get user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const user = await userResponse.json();

    // Get guild member info (to check roles etc)
    const memberResponse = await fetch(
      `https://discord.com/api/users/@me/guilds/1303027633679896608/member`,
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    const member = memberResponse.ok ? await memberResponse.json() : null;

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: user.id,
        username: user.username,
        avatar: user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : null,
        nickname: member?.nick || user.username,
        roles: member?.roles || [],
        accessToken: tokenData.access_token,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};