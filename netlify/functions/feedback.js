exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { type, title, description, severity, userId, username, device } = data;

    // Create GitHub issue for bugs
    if (type === 'bug' && data.githubIssue) {
      const issueBody = `
**Bug Report** 🐛

**Severity:** ${severity}
**Reporter:** ${username} (${userId})
**Screen:** ${data.screen || 'Unknown'}
**Time:** ${data.timestamp}

## Description
${description}

## Steps to Reproduce
${data.steps || 'Not provided'}

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
            labels: ['bug', severity, 'mobile-app'],
          }),
        }
      );

      const issueData = await githubResponse.json();
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          issueUrl: issueData.html_url,
          issueNumber: issueData.number 
        }),
      };
    }

    // Store feedback in database or send to Discord webhook
    if (type === 'feedback') {
      // Send to Discord channel
      await fetch(process.env.DISCORD_FEEDBACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `New Feedback: ${data.category}`,
            description: data.message,
            color: 0x6C63FF,
            fields: [
              { name: 'User', value: username || 'Anonymous', inline: true },
              { name: 'Rating', value: '⭐'.repeat(data.rating) || 'None', inline: true },
              { name: 'Device', value: `${device.device} (${device.platform})`, inline: true },
            ],
            timestamp: data.timestamp,
          }],
        }),
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};