export const handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      hasToken: !!process.env.BOT_SECRET_TOKEN,
      tokenLength: process.env.BOT_SECRET_TOKEN?.length || 0,
      // Don't expose the actual token!
      envVars: Object.keys(process.env).filter(key => key.includes('BOT'))
    })
  };
};