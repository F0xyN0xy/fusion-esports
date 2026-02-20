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

export const handler = async () => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  const binId  = process.env.JSONBIN_BIN_ID;
  const apiKey = process.env.JSONBIN_API_KEY;

  // If JSONBin isn't configured yet, just return defaults
  if (!binId || !apiKey) {
    return { statusCode: 200, headers, body: JSON.stringify(DEFAULT_CONFIG) };
  }

  try {
    const res  = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { "X-Master-Key": apiKey }
    });
    const data = await res.json();
    const config = data.record || DEFAULT_CONFIG;
    return { statusCode: 200, headers, body: JSON.stringify(config) };
  } catch (error) {
    console.error("Error fetching config:", error);
    return { statusCode: 200, headers, body: JSON.stringify(DEFAULT_CONFIG) };
  }
};
