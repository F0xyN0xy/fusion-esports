const DEFAULT_CONFIG = {
  discordUrl: "https://discord.gg/Nsng7acTP7",
  memberCount: "50+",
  onlineCount: "auto",
  discordServerId: "1303027633679896608",
  tournament: {
    dayOfWeek: 6,
    hour: 18,
    minute: 0,
    name: "Fusion Weekly",
    upcomingCount: 5,
  },
  socials: [
    { platform: "youtube", name: "Team Fusion",  desc: "Main channel — highlights, montages & more", url: "https://www.youtube.com/@CjThe13" },
    { platform: "youtube", name: "Our Editor",   desc: "Editing wizard behind the scenes",           url: "https://www.youtube.com/@mutxhirr" },
    { platform: "youtube", name: "Hypn0tic RL",  desc: "Content creator & community pillar",         url: "https://www.youtube.com/@Hypn0tic_RL" },
    { platform: "website", name: "FoxyNoxy",     desc: "Website designer & developer",               url: "https://foxynoxy-socials.netlify.app" },
  ],
};

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Bot-Token",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  // Check required env vars
  const expectedToken = process.env.BOT_SECRET_TOKEN;
  const binId         = process.env.JSONBIN_BIN_ID;
  const apiKey        = process.env.JSONBIN_API_KEY;

  if (!expectedToken) return { statusCode: 500, headers, body: JSON.stringify({ error: "BOT_SECRET_TOKEN not set in Netlify environment variables" }) };
  if (!binId)         return { statusCode: 500, headers, body: JSON.stringify({ error: "JSONBIN_BIN_ID not set in Netlify environment variables" }) };
  if (!apiKey)        return { statusCode: 500, headers, body: JSON.stringify({ error: "JSONBIN_API_KEY not set in Netlify environment variables" }) };

  // Verify bot token
  const botToken = event.headers["x-bot-token"];
  if (botToken !== expectedToken) return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };

  try {
    const updates = JSON.parse(event.body);

    // Get current config from JSONBin
    const getRes = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { "X-Master-Key": apiKey }
    });
    const getData = await getRes.json();
    const currentConfig = getData.record || DEFAULT_CONFIG;

    // Merge
    const newConfig = {
      ...currentConfig,
      ...updates,
      tournament: { ...currentConfig.tournament, ...(updates.tournament || {}) },
      socials: updates.socials || currentConfig.socials,
    };

    // Save back to JSONBin
    await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Master-Key": apiKey },
      body: JSON.stringify(newConfig)
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, config: newConfig }) };

  } catch (error) {
    console.error("Error:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
