export const handler = async (event) => {
  const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const CHANNEL_ID = '1472272446408102121';

  try {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=20`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    const messages = await response.json();

    const cleanContent = (content) => {
      return content
        .replace(/<@&\d+>/g, '')       // Remove role mentions
        .replace(/<@!?\d+>/g, '')       // Remove user mentions
        .replace(/<#\d+>/g, '')         // Remove channel mentions
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
        .replace(/\*(.*?)\*/g, '$1')     // Remove italic markdown
        .replace(/__(.*?)__/g, '$1')     // Remove underline markdown
        .replace(/~~(.*?)~~/g, '$1')     // Remove strikethrough
        .replace(/\|\|(.*?)\|\|/g, '$1') // Remove spoilers
        .replace(/`(.*?)`/g, '$1')       // Remove inline code
        .trim();
    };

    const announcements = messages
      .filter(msg => msg.content || msg.attachments.length > 0)
      .map((msg) => ({
        id: msg.id,
        content: cleanContent(msg.content || ''),
        author: msg.author.username,
        authorAvatar: msg.author.avatar
          ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
          : null,
        timestamp: msg.timestamp,
        attachments: msg.attachments.map((a) => a.url),
      }));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(announcements),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};