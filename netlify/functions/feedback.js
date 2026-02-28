export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { type, title, description, severity, userId, username, device, category, message, rating, steps, screen, timestamp } = data;

    if (type === 'bug') {
      const issueBody = `
**Bug Report** 🐛

**Severity:** ${severity || 'Unknown'}
**Reporter:** ${username} (${userId})
**Screen:** ${screen || 'Unknown'}
**Time:** ${timestamp}

## Description
${description}

## Steps to Reproduce
${steps || 'Not provided'}

## Device Info
\`\`\`json
${JSON.stringify(device, null, 2)}
\`\`\`

---
*Submitted via Fusion Esports App*
      `.trim();

      const githubResponse = await fetch(
        `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/issues`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `[BUG] ${title}`,
            body: issueBody,
            labels: ['bug', severity || 'medium', 'mobile-app'],
          }),
        }
      );

      const issueData = await githubResponse.json();

      if (!githubResponse.ok) {
        throw new Error(issueData.message || 'GitHub API error');
      }

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          issueUrl: issueData.html_url,
          issueNumber: issueData.number,
        }),
      };
    }

    if (type === 'feedback') {
      const stars = '⭐'.repeat(rating || 0);
      const webhookResponse = await fetch(process.env.DISCORD_FEEDBACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `💬 New Feedback: ${category || 'General'}`,
            description: message || description,
            color: 0x6C63FF,
            fields: [
              { name: 'User', value: `${username} (${userId})`, inline: true },
              { name: 'Rating', value: stars || 'No rating', inline: true },
              { name: 'Device', value: device ? `${device.model || 'Unknown'} (${device.platform || 'Unknown'})` : 'Unknown', inline: true },
            ],
            timestamp: timestamp || new Date().toISOString(),
            footer: { text: 'Fusion Esports App' },
          }],
        }),
      });

      if (!webhookResponse.ok) {
        throw new Error('Discord webhook failed');
      }

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid type. Must be "bug" or "feedback"' }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};