import { REST, Routes, SlashCommandBuilder, ChannelType } from 'discord.js';
import { config } from 'dotenv';
config();

const commands = [

    // ── Utility ──────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check if the bot is online'),

    new SlashCommandBuilder()
        .setName('server-info')
        .setDescription('Show server stats'),

    new SlashCommandBuilder()
        .setName('set-status')
        .setDescription('Change the bot status')
        .addStringOption(o => o.setName('text').setDescription('Status text (leave empty to resume auto-rotation)'))
        .addStringOption(o => o.setName('type').setDescription('Activity type').addChoices(
            { name: 'Watching',  value: 'watching'  },
            { name: 'Playing',   value: 'playing'   },
            { name: 'Listening', value: 'listening' },
            { name: 'Competing', value: 'competing' },
        )),

    // ── Moderation ────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Post an announcement embed')
        .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(true))
        .addStringOption(o => o.setName('title').setDescription('Title').setRequired(true))
        .addStringOption(o => o.setName('message').setDescription('Body text').setRequired(true))
        .addStringOption(o => o.setName('color').setDescription('Embed colour').addChoices(
            { name: 'Purple (default)', value: 'purple' },
            { name: 'Blue',   value: 'blue'   },
            { name: 'Green',  value: 'green'  },
            { name: 'Red',    value: 'red'    },
            { name: 'Orange', value: 'orange' },
            { name: 'Yellow', value: 'yellow' },
            { name: 'White',  value: 'white'  },
        ))
        .addRoleOption(o => o.setName('role').setDescription('Role to ping (leave empty for no ping)')),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Bulk delete messages')
        .addIntegerOption(o => o.setName('amount').setDescription('Number of messages (1–100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .addChannelOption(o => o.setName('channel').setDescription('Channel to clear (defaults to current)')),

    // ── Events ────────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('tournament-reminder')
        .setDescription('Send a tournament starting reminder')
        .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(true))
        .addStringOption(o => o.setName('time').setDescription('How soon is it starting?').setRequired(true).addChoices(
            { name: '30 minutes',  value: '30min' },
            { name: '10 minutes',  value: '10min' },
            { name: 'Starting NOW', value: 'now'  },
        ))
        .addRoleOption(o => o.setName('role').setDescription('Role to ping'))
        .addStringOption(o => o.setName('name').setDescription('Tournament name (default: Fusion Weekly)')),

    new SlashCommandBuilder()
        .setName('scrim-ping')
        .setDescription('Ping for scrims')
        .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(true))
        .addRoleOption(o => o.setName('role').setDescription('Scrims role to ping').setRequired(true))
        .addStringOption(o => o.setName('team_size').setDescription('Format').addChoices(
            { name: '1v1', value: '1v1' },
            { name: '2v2', value: '2v2' },
            { name: '3v3', value: '3v3' },
        ))
        .addStringOption(o => o.setName('rank').setDescription('Rank requirement (e.g. Diamond+, All ranks)'))
        .addStringOption(o => o.setName('time').setDescription('Time (e.g. Now, 8pm UK)'))
        .addStringOption(o => o.setName('note').setDescription('Extra info')),

    // ── YouTube ───────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('yt-add')
        .setDescription('Track a YouTube channel for new video notifications')
        .addStringOption(o => o.setName('name').setDescription('Friendly name (e.g. "Team Fusion")').setRequired(true))
        .addStringOption(o => o.setName('channel_id').setDescription('YouTube Channel ID (starts with UC...)').setRequired(true))
        .addChannelOption(o => o.setName('notify_channel').setDescription('Discord channel to post notifications in').setRequired(true))
        .addRoleOption(o => o.setName('role').setDescription('Role to ping (leave empty to ping @everyone)')),

    new SlashCommandBuilder()
        .setName('yt-remove')
        .setDescription('Stop tracking a YouTube channel')
        .addStringOption(o => o.setName('name').setDescription('Friendly name of the channel to remove').setRequired(true)),

    new SlashCommandBuilder()
        .setName('yt-list')
        .setDescription('List all tracked YouTube channels'),

    // ── Website ───────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('view-config')
        .setDescription('View current website configuration'),

    new SlashCommandBuilder()
        .setName('set-members')
        .setDescription('Update the member count on the website')
        .addStringOption(o => o.setName('count').setDescription('e.g. 500+ or 1.2k').setRequired(true)),

    new SlashCommandBuilder()
        .setName('set-online')
        .setDescription('Update the online count on the website')
        .addStringOption(o => o.setName('count').setDescription('Number, or leave blank for auto (live Discord widget)')),

    new SlashCommandBuilder()
        .setName('set-discord')
        .setDescription('Update the Discord invite URL on the website')
        .addStringOption(o => o.setName('url').setDescription('Discord invite URL').setRequired(true)),

    new SlashCommandBuilder()
        .setName('set-tournament')
        .setDescription('Update tournament schedule on the website')
        .addIntegerOption(o => o.setName('day').setDescription('Day of week (0=Sun, 6=Sat)').setMinValue(0).setMaxValue(6))
        .addIntegerOption(o => o.setName('hour').setDescription('Hour in UK time (0–23)').setMinValue(0).setMaxValue(23))
        .addIntegerOption(o => o.setName('minute').setDescription('Minute (0–59)').setMinValue(0).setMaxValue(59))
        .addStringOption(o => o.setName('name').setDescription('Tournament name'))
        .addIntegerOption(o => o.setName('upcoming_count').setDescription('Upcoming dates to show (1–10)').setMinValue(1).setMaxValue(10)),

    new SlashCommandBuilder()
        .setName('add-social')
        .setDescription('Add a social card to the website')
        .addStringOption(o => o.setName('platform').setDescription('Platform').setRequired(true).addChoices(
            { name: 'YouTube',   value: 'youtube'   },
            { name: 'TikTok',    value: 'tiktok'    },
            { name: 'Twitter/X', value: 'twitter'   },
            { name: 'Twitch',    value: 'twitch'    },
            { name: 'Instagram', value: 'instagram' },
            { name: 'Website',   value: 'website'   },
        ))
        .addStringOption(o => o.setName('name').setDescription('Display name').setRequired(true))
        .addStringOption(o => o.setName('description').setDescription('Short description').setRequired(true))
        .addStringOption(o => o.setName('url').setDescription('Full URL').setRequired(true)),

    new SlashCommandBuilder()
        .setName('remove-social')
        .setDescription('Remove a social card from the website')
        .addStringOption(o => o.setName('name').setDescription('Name of the card to remove').setRequired(true)),

    // ── XP ────────────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your XP rank')
        .addUserOption(o => o.setName('user').setDescription('User to check (leave empty for yourself)')),

    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show the top 10 XP leaderboard'),

    // ── Fun ───────────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin'),

    new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a poll with reactions')
        .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true))
        .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true))
        .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true))
        .addStringOption(o => o.setName('option3').setDescription('Option 3'))
        .addStringOption(o => o.setName('option4').setDescription('Option 4')),

    // ── Welcome ───────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('welcome-setup')
        .setDescription('Configure welcome messages')
        .addChannelOption(o => o.setName('channel').setDescription('Channel for welcome messages').setRequired(true))
        .addStringOption(o => o.setName('message').setDescription('Template — use {user}, {server}, {membercount}').setRequired(true)),

    new SlashCommandBuilder()
        .setName('welcome-disable')
        .setDescription('Disable welcome messages'),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🔄 Deploying ${commands.length} commands...`);
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );
        console.log('✅ All commands deployed!');
        commands.forEach(c => console.log(`  /${c.name}`));
    } catch (err) {
        console.error('❌ Deploy error:', err);
    }
})();
