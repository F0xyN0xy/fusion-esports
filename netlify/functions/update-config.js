import { getStore } from "@netlify/blobs";

const DEFAULT_CONFIG = {
  discordUrl: "https://discord.gg/Nsng7acTP7",
  memberCount: "60+",
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
    { platform: "youtube", name: "Team Fusion", desc: "Main channel — highlights, montages & more", url: "https://www.youtube.com/@CjThe13" },
    { platform: "youtube", name: "Our Editor", desc: "Editing wizard behind the scenes", url: "https://www.youtube.com/@mutxhirr" },
    { platform: "youtube", name: "Hypn0tic RL", desc: "Content creator & community pillar", url: "https://www.youtube.com/@Hypn0tic_RL" },
    { platform: "website", name: "FoxyNoxy", desc: "Website designer & developer", url: "https://foxynoxy-socials.netlify.app" },
  ],
};

export const handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Bot-Token",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    // Verify bot token
    const botToken = event.headers["x-bot-token"];
    const expectedToken = process.env.BOT_SECRET_TOKEN;
    
    if (!expectedToken) {
      console.error("BOT_SECRET_TOKEN not configured");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server configuration error" })
      };
    }

    if (botToken !== expectedToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }

    const updates = JSON.parse(event.body);
    
    // Get current config
    const store = getStore("config");
    let currentConfig = DEFAULT_CONFIG;
    
    try {
      const data = await store.get("site-config");
      if (data) {
        currentConfig = JSON.parse(data);
      }
    } catch (err) {
      console.log("No existing config, using defaults");
    }

    // Merge updates with current config
    const newConfig = {
      ...currentConfig,
      ...updates,
      tournament: {
        ...currentConfig.tournament,
        ...(updates.tournament || {})
      },
      socials: updates.socials || currentConfig.socials
    };

    // Save to Netlify Blobs
    await store.set("site-config", JSON.stringify(newConfig));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: "Configuration updated successfully",
        config: newConfig
      })
    };
    
  } catch (error) {
    console.error("Error updating config:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || "Internal server error"
      })
    };
  }
};
