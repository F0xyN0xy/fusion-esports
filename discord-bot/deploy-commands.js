import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from 'dotenv';
config();

const commands = [

    // ── Utility ──────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check if the bot is online'),

    new SlashCommandBuilder()
        .setName('server-info')
        .setDescription('Display server stats and information'),

    new SlashCommandBuilder()
        .setName('set-status')
        .setDescription('Change the bot\'s activity status')
        .addStringOption(o => o.setName('text').setDescription('Status text (leave empty to resume auto-rotation)'))
        .addStringOption(o => o.setName('type').setDescription('Activity type').addChoices(
            { name: 'Watching',  value: 'watching'  },
            { name: 'Playing',   value: 'playing'   },
            { name: 'Listening', value: 'listening' },
            { name: 'Competing', value: 'competing' },
        )),

    new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Post a styled announcement embed to a channel')
        .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(true))
        .addStringOption(o => o.setName('title').setDescription('Announcement title').setRequired(true))
        .addStringOption(o => o.setName('message').setDescription('Announcement body').setRequired(true))
        .addStringOption(o => o.setName('color').setDescription('Embed color').addChoices(
            { name: 'Purple (default)', value: 'purple' },
            { name: 'Blue',   value: 'blue'   },
            { name: 'Green',  value: 'green'  },
            { name: 'Red',    value: 'red'    },
            { name: 'Orange', value: 'orange' },
            { name: 'Yellow', value: 'yellow' },
            { name: 'White',  value: 'white'  },
        )),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Bulk delete messages from a channel')
        .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete (1–100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .addChannelOption(o => o.setName('channel').setDescription('Channel to clear (defaults to current)')),

    // ── Website ───────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('view-config')
        .setDescription('View current website configuration'),

    new SlashCommandBuilder()
        .setName('set-members')
        .setDescription('Update the total member count on the website')
        .addStringOption(o => o.setName('count').setDescription('e.g. "500+" or "1.2k"').setRequired(true)),

    new SlashCommandBuilder()
        .setName('set-online')
        .setDescription('Update the online count on the website')
        .addStringOption(o => o.setName('count').setDescription('Number to show, or leave blank / type "auto" for live Discord widget')),

    new SlashCommandBuilder()
        .setName('set-discord')
        .setDescription('Update the Discord invite URL on the website')
        .addStringOption(o => o.setName('url').setDescription('Discord invite URL').setRequired(true)),

    new SlashCommandBuilder()
        .setName('set-tournament')
        .setDescription('Update the weekly tournament schedule on the website')
        .addIntegerOption(o => o.setName('day').setDescription('Day of week (0=Sunday … 6=Saturday)').setMinValue(0).setMaxValue(6))
        .addIntegerOption(o => o.setName('hour').setDescription('Hour in UK time (0–23)').setMinValue(0).setMaxValue(23))
        .addIntegerOption(o => o.setName('minute').setDescription('Minute (0–59)').setMinValue(0).setMaxValue(59))
        .addStringOption(o => o.setName('name').setDescription('Tournament name'))
        .addIntegerOption(o => o.setName('upcoming_count').setDescription('How many upcoming dates to show (1–10)').setMinValue(1).setMaxValue(10)),

    new SlashCommandBuilder()
        .setName('add-social')
        .setDescription('Add a social media card to the website')
        .addStringOption(o => o.setName('platform').setDescription('Platform').setRequired(true).addChoices(
            { name: 'YouTube',    value: 'youtube'   },
            { name: 'TikTok',     value: 'tiktok'    },
            { name: 'Twitter/X',  value: 'twitter'   },
            { name: 'Twitch',     value: 'twitch'    },
            { name: 'Instagram',  value: 'instagram' },
            { name: 'Website',    value: 'website'   },
        ))
        .addStringOption(o => o.setName('name').setDescription('Display name').setRequired(true))
        .addStringOption(o => o.setName('description').setDescription('Short description').setRequired(true))
        .addStringOption(o => o.setName('url').setDescription('Full URL').setRequired(true)),

    new SlashCommandBuilder()
        .setName('remove-social')
        .setDescription('Remove a social media card from the website')
        .addStringOption(o => o.setName('name').setDescription('Name of the card to remove').setRequired(true)),

    // ── Welcome ───────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('welcome-setup')
        .setDescription('Configure welcome messages for new members')
        .addChannelOption(o => o.setName('channel').setDescription('Channel to send welcome messages').setRequired(true))
        .addStringOption(o => o.setName('message').setDescription('Message template — use {user}, {server}, {membercount}').setRequired(true)),

    new SlashCommandBuilder()
        .setName('welcome-disable')
        .setDescription('Disable welcome messages'),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🔄 Deploying ${commands.length} slash commands...`);

        // Guild deploy = instant. Switch to applicationCommands() for global (1hr delay).
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log('✅ Commands deployed successfully!');
        console.log('Commands registered:');
        commands.forEach(c => console.log(`  /${c.name} — ${c.description}`));
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
})();
