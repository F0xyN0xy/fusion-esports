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
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const store = getStore("config");
    const data = await store.get("site-config");
    
    if (data) {
      const config = JSON.parse(data);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(config)
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(DEFAULT_CONFIG)
    };
    
  } catch (error) {
    console.error("Error fetching config:", error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(DEFAULT_CONFIG)
    };
  }
};
