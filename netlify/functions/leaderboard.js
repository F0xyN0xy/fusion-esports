export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "GET")     return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const binId  = process.env.XP_JSONBIN_ID;
  const apiKey = process.env.JSONBIN_API_KEY;

  if (!binId || !apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "XP_JSONBIN_ID or JSONBIN_API_KEY not set" }) };
  }

  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { "X-Master-Key": apiKey }
    });

    if (!res.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: `JSONBin error: ${res.status}` }) };
    }

    const data       = await res.json();
    const leaderboard = data?.record?.leaderboard || [];

    // App expects a plain JSON array
    return { statusCode: 200, headers, body: JSON.stringify(leaderboard) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};