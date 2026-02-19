import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from 'dotenv';
config();

const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check if the bot is online'),
    
    new SlashCommandBuilder()
        .setName('set-members')
        .setDescription('Update the total member count on the website')
        .addStringOption(option =>
            option.setName('count')
                .setDescription('Member count (e.g., "500+" or "1.2k")')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('set-discord')
        .setDescription('Update the Discord invite URL on the website')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('Discord invite URL')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('set-tournament')
        .setDescription('Update tournament schedule')
        .addIntegerOption(option =>
            option.setName('day')
                .setDescription('Day of week (0=Sunday, 6=Saturday)')
                .setMinValue(0)
                .setMaxValue(6))
        .addIntegerOption(option =>
            option.setName('hour')
                .setDescription('Hour in UK time (0-23)')
                .setMinValue(0)
                .setMaxValue(23))
        .addIntegerOption(option =>
            option.setName('minute')
                .setDescription('Minute (0-59)')
                .setMinValue(0)
                .setMaxValue(59))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Tournament name'))
        .addIntegerOption(option =>
            option.setName('upcoming_count')
                .setDescription('How many upcoming dates to show (1-10)')
                .setMinValue(1)
                .setMaxValue(10)),
    
    new SlashCommandBuilder()
        .setName('add-social')
        .setDescription('Add a social media card to the website')
        .addStringOption(option =>
            option.setName('platform')
                .setDescription('Social platform')
                .setRequired(true)
                .addChoices(
                    { name: 'YouTube', value: 'youtube' },
                    { name: 'TikTok', value: 'tiktok' },
                    { name: 'Twitter/X', value: 'twitter' },
                    { name: 'Twitch', value: 'twitch' },
                    { name: 'Instagram', value: 'instagram' },
                    { name: 'Website', value: 'website' }
                ))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Display name')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Short description')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('url')
                .setDescription('Full URL')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('remove-social')
        .setDescription('Remove a social media card from the website')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name of the social card to remove')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('view-config')
        .setDescription('View current website configuration')
        .setDefaultMemberPermissions(0), // Public command - anyone can use
    
    new SlashCommandBuilder()
        .setName('welcome-setup')
        .setDescription('Configure welcome messages')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send welcome messages')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Welcome message (use {user} for mention, {server} for server name)')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('welcome-disable')
        .setDescription('Disable welcome messages')
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🔄 Started refreshing application (/) commands.');

        // Register commands globally (takes up to 1 hour to update)
        // await rest.put(
        //     Routes.applicationCommands(process.env.CLIENT_ID),
        //     { body: commands },
        // );

        // Register commands to a specific guild (instant update)
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
})();