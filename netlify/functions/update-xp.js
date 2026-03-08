export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Bot-Token",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const expectedToken = process.env.BOT_SECRET_TOKEN;
  const binId         = process.env.XP_JSONBIN_ID;
  const apiKey        = process.env.JSONBIN_API_KEY;

  if (!expectedToken) return { statusCode: 500, headers, body: JSON.stringify({ error: "BOT_SECRET_TOKEN not set" }) };
  if (!binId)         return { statusCode: 500, headers, body: JSON.stringify({ error: "XP_JSONBIN_ID not set in Netlify environment variables" }) };
  if (!apiKey)        return { statusCode: 500, headers, body: JSON.stringify({ error: "JSONBIN_API_KEY not set" }) };

  const botToken = event.headers["x-bot-token"];
  if (botToken !== expectedToken) return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };

  try {
    const { leaderboard } = JSON.parse(event.body);

    // Write leaderboard directly to the XP bin
    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json", "X-Master-Key": apiKey },
      body:    JSON.stringify({ leaderboard, updatedAt: new Date().toISOString() }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { statusCode: 500, headers, body: JSON.stringify({ error: `JSONBin error: ${err}` }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (error) {
    console.error("XP sync error:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};