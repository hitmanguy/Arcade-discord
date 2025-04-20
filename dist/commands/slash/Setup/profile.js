"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../../handler");
const discord_js_1 = require("discord.js");
const promises_1 = require("node:timers/promises");
const user_services_1 = require("../../../services/user_services");
const GAME_CONSTANTS_1 = require("../../../constants/GAME_CONSTANTS");
exports.default = new handler_1.SlashCommand({
    registerType: handler_1.RegisterType.Guild,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('profile')
        .setDescription('View and manage your Infinite Prison profile')
        .addSubcommand(subcommand => subcommand
        .setName('view')
        .setDescription('View your prison profile')
        .addUserOption(option => option
        .setName('user')
        .setDescription('User to view (defaults to yourself)')
        .setRequired(false)))
        .addSubcommand(subcommand => subcommand
        .setName('stats')
        .setDescription('View detailed stats about your prison life')),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild?.members.cache.get(targetUser.id);
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply({ flags: [discord_js_1.MessageFlags.Ephemeral] });
        let userData = await user_services_1.UserService.getUserData(targetUser.id, member);
        if (!userData) {
            const notRegisteredEmbed = new discord_js_1.EmbedBuilder()
                .setColor(GAME_CONSTANTS_1.PRISON_COLORS.warning)
                .setTitle('❌ Not Registered')
                .setDescription('You haven\'t registered to the Infinite Prison yet.')
                .addFields({
                name: 'How to Register',
                value: 'Use `/register` to begin your sentence in the Infinite Prison.'
            });
            await interaction.editReply({ embeds: [notRegisteredEmbed] });
            return;
        }
        if (subcommand === 'view') {
            await showProfile(interaction, userData, member);
        }
        else if (subcommand === 'stats') {
            await showDetailedStats(interaction, userData);
        }
    },
});
async function showProfile(interaction, userData, member) {
    const hasEscaped = userData.completedAllPuzzles;
    const loadingEmbed = new discord_js_1.EmbedBuilder()
        .setColor(GAME_CONSTANTS_1.PRISON_COLORS.primary)
        .setTitle('🔄 Accessing Infinite Prison Database...')
        .setDescription('```\nConnecting to secure prison records...\n```');
    await interaction.editReply({ embeds: [loadingEmbed] });
    for (let i = 0; i < 3; i++) {
        await (0, promises_1.setTimeout)(800);
        await interaction.editReply({
            embeds: [
                loadingEmbed.setDescription(`\`\`\`\nAccessing inmate #${userData.discordId.slice(-6)}${'.'.repeat(i + 1)}\n\`\`\``)
            ]
        });
    }
    const profileEmbed = new discord_js_1.EmbedBuilder()
        .setColor(hasEscaped ? '#FFD700' : GAME_CONSTANTS_1.PRISON_COLORS.accent)
        .setTitle(`${hasEscaped ? '🌟' : '🔒'} INFINITE PRISON - INMATE #${userData.discordId.slice(-6)}`)
        .setThumbnail(member?.user.displayAvatarURL({ extension: 'png' }) || null)
        .addFields({ name: '👤 Identity', value: `**Name:** ${userData.username}\n**Cell:** A-01\n**Role:** Inmate`, inline: true }, { name: '📊 Status', value: `**Days Survived:** ${userData.survivalDays}\n**Sanity:** ${userData.sanity}/100\n**Merit Points:** ${userData.meritPoints}`, inline: true }, { name: '⚠️ Security', value: `**Suspicion Level:** ${userData.suspiciousLevel}/100\n**Isolation:** ${userData.isInIsolation ? 'Yes' : 'No'}`, inline: true })
        .setFooter({ text: `Incarcerated since: ${new Date(userData.joinedAt).toLocaleDateString()}` });
    if (hasEscaped) {
        profileEmbed.addFields({
            name: '🎯 Motivations',
            value: '*"Though I\'ve found my way out, I remain in these halls. Not as a prisoner, ' +
                'but as a guide for those still searching for their escape. The games continue, ' +
                'but now they\'re played by choice, not necessity."*',
            inline: false
        });
        profileEmbed.addFields({
            name: '🎮 Achievements',
            value: hasEscaped
                ? `🏆 **Master Escapist** - Completed all puzzles\n${userData.achievements.length > 0 ? userData.achievements.join('\n') : 'Continuing to collect more...'}`
                : (userData.achievements.length > 0 ? userData.achievements.join('\n') : 'None yet'),
            inline: false
        });
    }
    profileEmbed.setFooter({
        text: hasEscaped
            ? `Escaped now:Originally imprisoned: ${new Date(userData.joinedAt).toLocaleDateString()}`
            : `Incarcerated since: ${new Date(userData.joinedAt).toLocaleDateString()}`
    });
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('profile:inventory')
        .setLabel('🎒 Inventory')
        .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
        .setCustomId('profile:stats')
        .setLabel('📊 Statistics')
        .setStyle(discord_js_1.ButtonStyle.Primary));
    await interaction.editReply({
        embeds: [profileEmbed],
        components: [row]
    });
    const timeoutDuration = 60000;
    const collector = interaction.channel?.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith('profile:'),
        time: timeoutDuration
    });
    collector?.on('collect', async (i) => {
        const action = i.customId.split(':')[1];
        switch (action) {
            case 'inventory':
                await showInventory(i, userData);
                break;
            case 'stats':
                await showStats(i, userData);
                break;
            case 'back':
                await i.update({
                    embeds: [profileEmbed],
                    components: [row]
                });
                break;
        }
    });
    collector?.on('end', () => {
        const timeoutEmbed = new discord_js_1.EmbedBuilder()
            .setColor(GAME_CONSTANTS_1.PRISON_COLORS.primary)
            .setTitle(`🔒 INFINITE PRISON - INMATE #${userData.discordId.slice(-6)}`)
            .setDescription('**Session timed out**\nThe terminal has automatically logged out due to inactivity.')
            .setFooter({ text: 'Use the /profile command again to access your data' });
        interaction.editReply({
            embeds: [timeoutEmbed],
            components: []
        }).catch(() => { });
    });
}
async function showInventory(interaction, userData) {
    const items = user_services_1.UserService.getFormattedInventory(userData);
    const inventoryEmbed = new discord_js_1.EmbedBuilder()
        .setColor(GAME_CONSTANTS_1.PRISON_COLORS.info)
        .setTitle('🎒 Inmate Inventory')
        .setDescription(items.length > 0 ? items.join('\n') : 'Your inventory is empty')
        .setFooter({ text: 'Contraband items will lead to infractions if discovered during cell inspections' });
    const backButton = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('profile:back')
        .setLabel('⬅️ Back to Profile')
        .setStyle(discord_js_1.ButtonStyle.Secondary));
    await interaction.update({
        embeds: [inventoryEmbed],
        components: [backButton]
    });
}
async function showStats(interaction, userData) {
    const statsEmbed = new discord_js_1.EmbedBuilder()
        .setColor(GAME_CONSTANTS_1.PRISON_COLORS.warning)
        .setTitle('📊 Inmate Statistics')
        .addFields({ name: '🎮 Game History', value: `Games Played: ${userData.totalGamesPlayed}\nGames Won: ${userData.totalGamesWon}\nCurrent Streak: ${userData.currentStreak}` }, { name: '🏆 Last Game', value: userData.lastGame?.type ? `Type: ${userData.lastGame.type}\nResult: ${userData.lastGame.result}\nPlayed: ${new Date(userData.lastGame.playedAt).toLocaleDateString()}` : 'No games played yet' })
        .setFooter({ text: 'Your performance is continuously monitored by prison authorities' });
    const backButton = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('profile:back')
        .setLabel('⬅️ Back to Profile')
        .setStyle(discord_js_1.ButtonStyle.Secondary));
    await interaction.update({
        embeds: [statsEmbed],
        components: [backButton]
    });
}
async function showDetailedStats(interaction, userData) {
    const loadingEmbed = new discord_js_1.EmbedBuilder()
        .setColor(GAME_CONSTANTS_1.PRISON_COLORS.primary)
        .setTitle('🔄 Retrieving Behavioral Records...')
        .setDescription('```\nAnalyzing inmate performance metrics...\n```');
    await interaction.editReply({ embeds: [loadingEmbed] });
    await (0, promises_1.setTimeout)(1500);
    const sanityBar = (0, GAME_CONSTANTS_1.createProgressBar)(userData.sanity, 100);
    const suspicionBar = (0, GAME_CONSTANTS_1.createProgressBar)(userData.suspiciousLevel, 100);
    const statsEmbed = new discord_js_1.EmbedBuilder()
        .setColor(GAME_CONSTANTS_1.PRISON_COLORS.info)
        .setTitle(`📊 INMATE STATISTICS - #${userData.discordId.slice(-6)}`)
        .setDescription(`Comprehensive analysis of ${userData.username}'s prison record`)
        .addFields({ name: '🧠 Sanity', value: `${sanityBar} ${userData.sanity}/100`, inline: false }, { name: '⚠️ Suspicion Level', value: `${suspicionBar} ${userData.suspiciousLevel}/100`, inline: false }, { name: '📈 Activity Stats', value: `Games Played: ${userData.totalGamesPlayed}\nGames Won: ${userData.totalGamesWon}\nWin Rate: ${userData.totalGamesPlayed ? Math.round((userData.totalGamesWon / userData.totalGamesPlayed) * 100) : 0}%\nCurrent Streak: ${userData.currentStreak}`, inline: false }, { name: '🏆 Achievements', value: userData.achievements.length > 0 ? userData.achievements.join('\n') : 'No achievements unlocked yet', inline: false })
        .setFooter({ text: 'Performance is continuously monitored by prison authorities' });
    const actionsRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('stats:inventory')
        .setLabel('🎒 Inventory')
        .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
        .setCustomId('stats:back')
        .setLabel('⬅️ Back')
        .setStyle(discord_js_1.ButtonStyle.Secondary));
    await interaction.editReply({
        embeds: [statsEmbed],
        components: [actionsRow]
    });
    const timeoutDuration = 60000;
    const collector = interaction.channel?.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith('stats:'),
        time: timeoutDuration
    });
    collector?.on('collect', async (i) => {
        const action = i.customId.split(':')[1];
        if (action === 'back') {
            await showProfile(interaction, userData, interaction.guild?.members.cache.get(userData.discordId));
        }
        else if (action === 'inventory') {
            await showInventory(i, userData);
        }
    });
    collector?.on('end', () => {
        const timeoutEmbed = new discord_js_1.EmbedBuilder()
            .setColor(GAME_CONSTANTS_1.PRISON_COLORS.primary)
            .setTitle(`📊 INMATE STATISTICS - #${userData.discordId.slice(-6)}`)
            .setDescription('**Session timed out**\nStatistics terminal has been locked due to inactivity.')
            .setFooter({ text: 'Use the /profile stats command again to view your data' });
        interaction.editReply({
            embeds: [timeoutEmbed],
            components: []
        }).catch(() => { });
    });
}
//# sourceMappingURL=profile.js.map