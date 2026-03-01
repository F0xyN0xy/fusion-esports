const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

export const handler = async (event) => {
  const { code, refresh, token } = event.queryStringParameters || {};

  // Handle profile refresh using existing access token
  if (refresh === 'true' && token) {
    try {
      const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userResponse.ok) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Token expired' }) };
      }

      const discordUser = await userResponse.json();
      const GUILD_ID = '1303027633679896608';

      const memberResponse = await fetch(
        `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordUser.id}`,
        { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
      );

      const member = memberResponse.ok ? await memberResponse.json() : null;

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          id: discordUser.id,
          username: discordUser.username,
          avatar: discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : null,
          nickname: member?.nick || discordUser.global_name || discordUser.username,
          roles: member?.roles || [],
          accessToken: token,
        }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
  }

  if (!code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No code provided' }),
    };
  }

  try {
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
      // Return full Discord error for debugging
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          error: 'Token exchange failed',
          discord_error: tokenData,
          redirect_uri_used: REDIRECT_URI,
          client_id_used: CLIENT_ID,
        }),
      };
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const user = await userResponse.json();

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