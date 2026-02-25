export const handler = async (event) => {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const GUILD_ID = '1303027633679896608';
    const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
    const XP_BIN_ID = '699ef08d43b1c97be99ccca3';

    try {
        // Fetch XP data from JSONBin
        const xpResponse = await fetch(
            `https://api.jsonbin.io/v3/b/${XP_BIN_ID}/latest`,
            { headers: { 'X-Master-Key': JSONBIN_API_KEY } }
        );
        const xpJson = await xpResponse.json();
        const xpData = xpJson.record;

        // Fetch all members from Discord
        const membersResponse = await fetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000`,
            { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
        );
        const members = await membersResponse.json();

        // Build a map of userId -> displayName + avatar
        const memberMap = {};
        for (const member of members) {
            memberMap[member.user.id] = {
                username: member.nick || member.user.global_name || member.user.username,
                avatar: member.user.avatar
                    ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
                    : null,
            };
        }

        // Combine XP data with member info
        const leaderboard = Object.entries(xpData)
            .map(([userId, stats]) => ({
                userId,
                username: memberMap[userId]?.username || `User #${userId.slice(-4)}`,
                avatar: memberMap[userId]?.avatar || null,
                xp: stats.xp,
                messages: stats.messages || 0,
                vcMinutes: stats.vcMinutes || 0,
            }))
            .sort((a, b) => b.xp - a.xp);

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(leaderboard),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message }),
        };
    }
};