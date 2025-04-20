"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../../handler");
const discord_js_1 = require("discord.js");
const user_status_1 = require("../../../model/user_status");
const user_services_1 = require("../../../services/user_services");
const GAME_CONSTANTS_1 = require("../../../constants/GAME_CONSTANTS");
const path_1 = require("path");
const DIRECTIONS = ['up', 'down', 'left', 'right'];
const DIRECTION_EMOJIS = {
    up: '⬆️',
    down: '⬇️',
    left: '⬅️',
    right: '➡️'
};
function generateSequence(difficulty) {
    const lengths = { easy: 4, medium: 6, hard: 8 };
    const length = lengths[difficulty];
    const sequence = [];
    for (let i = 0; i < length; i++) {
        sequence.push(DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]);
    }
    return sequence;
}
function formatSequence(sequence, sanity) {
    let formatted = sequence.map(dir => DIRECTION_EMOJIS[dir]).join(' ');
    if (sanity < 50) {
        const glitchChance = (100 - sanity) / 100;
        const arrows = Object.values(DIRECTION_EMOJIS);
        formatted = formatted.split(' ').map(arrow => Math.random() < glitchChance ?
            arrows[Math.floor(Math.random() * arrows.length)] :
            arrow).join(' ');
    }
    return formatted;
}
exports.default = new handler_1.SlashCommand({
    registerType: handler_1.RegisterType.Guild,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('tunnel')
        .setDescription('Navigate through the digital maze')
        .addStringOption(option => option.setName('difficulty')
        .setDescription('Choose your challenge level')
        .setRequired(true)
        .addChoices({ name: '😌 Easy (4 steps)', value: 'easy' }, { name: '😰 Medium (6 steps)', value: 'medium' }, { name: '😱 Hard (8 steps)', value: 'hard' })),
    async execute(interaction) {
        await interaction.deferReply();
        const user = await user_status_1.User.findOne({ discordId: interaction.user.id });
        if (!user) {
            await interaction.editReply('You need to register first! Use `/register` to begin your journey.');
            return;
        }
        const suspicous = user.suspiciousLevel > 50;
        const merit = user.meritPoints;
        if (merit < 150) {
            await interaction.editReply('You dont have enough merit points to play this. You can play the previous game to earn more points');
            return;
        }
        if (suspicous) {
            await interaction.editReply('You are too suspicious to play this game. Try again later.');
            return;
        }
        user.survivalDays += 1;
        await user.save();
        if (user.isInIsolation || user.suspiciousLevel >= 80) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(GAME_CONSTANTS_1.PRISON_COLORS.danger)
                .setTitle('⚠️ Access Denied')
                .setDescription(user.isInIsolation
                ? 'You are currently in isolation. Access to trials is restricted.'
                : 'Your suspicious behavior has been noted. Access temporarily restricted.')
                .setFooter({ text: 'Try again when your status improves' });
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        const difficulty = interaction.options.getString('difficulty', true);
        const sequence = generateSequence(difficulty);
        const game = {
            sequence,
            difficulty,
            attempts: 0,
            maxAttempts: difficulty === 'easy' ? 3 : difficulty === 'medium' ? 2 : 1
        };
        const tunnelGifPath = (0, path_1.join)(__dirname, '../../../Gifs/tunnel.gif');
        const tunnelGifAttachment = new discord_js_1.AttachmentBuilder(tunnelGifPath, { name: 'tunnel.gif' });
        const storylineData = GAME_CONSTANTS_1.STORYLINE.tunnel1;
        const initialEmbed = new discord_js_1.EmbedBuilder()
            .setColor(user.sanity < 30 ? GAME_CONSTANTS_1.PRISON_COLORS.danger : GAME_CONSTANTS_1.PRISON_COLORS.primary)
            .setTitle('🌀 The Digital Tunnel')
            .setDescription(`${storylineData.flavorText}\n\n` +
            (user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : '') +
            '**Memorize the sequence:**\n' +
            formatSequence(sequence, user.sanity))
            .setImage('attachment://tunnel.gif')
            .addFields({ name: '🎯 Difficulty', value: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`, inline: true }, { name: '💫 Attempts', value: `${game.maxAttempts}`, inline: true }, { name: '🧠 Sanity', value: `${(0, GAME_CONSTANTS_1.createProgressBar)(user.sanity, 100)} ${user.sanity}%`, inline: true })
            .setFooter({ text: user.sanity < 50 ? 'T̷h̷e̶ ̷w̶a̵l̷l̴s̷ ̶s̷h̵i̷f̷t̵.̷.̶.' : 'Remember the pattern...' });
        const message = await interaction.editReply({
            embeds: [initialEmbed],
            files: [tunnelGifAttachment]
        });
        const viewTime = Math.max(2000, Math.min(5000, user.sanity * 50));
        await new Promise(resolve => setTimeout(resolve, viewTime));
        const promptEmbed = new discord_js_1.EmbedBuilder()
            .setColor(GAME_CONSTANTS_1.PRISON_COLORS.primary)
            .setTitle('🌀 Enter the Sequence')
            .setDescription(user.sanity < 40 ?
            'T̷h̶e̷ ̵p̷a̴t̵h̷ ̵t̶w̷i̸s̷t̴s̷ ̵i̸n̵ ̷y̵o̷u̶r̵ ̴m̶i̶n̸d̸.̶.̵.' :
            'The sequence vanishes... What path did you see?');
        const buttonRow = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('show_sequence_modal')
            .setLabel('Enter Sequence')
            .setStyle(discord_js_1.ButtonStyle.Primary));
        await interaction.editReply({
            embeds: [promptEmbed],
            components: [buttonRow],
            files: []
        });
        const collector = message.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            time: 60000,
            filter: i => i.user.id === interaction.user.id
        });
        collector.on('collect', async (i) => {
            if (i.customId === 'show_sequence_modal') {
                const modal = new discord_js_1.ModalBuilder()
                    .setCustomId('sequence_input')
                    .setTitle('Enter the Sequence')
                    .addComponents(new discord_js_1.ActionRowBuilder()
                    .addComponents(new discord_js_1.TextInputBuilder()
                    .setCustomId('sequence_answer')
                    .setLabel('Type the directions')
                    .setPlaceholder('Example: up right down left')
                    .setStyle(discord_js_1.TextInputStyle.Short)
                    .setRequired(true)
                    .setMinLength(2)
                    .setMaxLength(50)));
                await i.showModal(modal);
            }
            else if (i.customId === 'retry_tunnel') {
                game.attempts++;
                collector.stop();
                const retryTunnelGifAttachment = new discord_js_1.AttachmentBuilder(tunnelGifPath, { name: 'tunnel.gif' });
                const retryEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(user.sanity < 30 ? GAME_CONSTANTS_1.PRISON_COLORS.danger : GAME_CONSTANTS_1.PRISON_COLORS.primary)
                    .setTitle('🌀 The Digital Tunnel - Retry')
                    .setDescription(`${storylineData.flavorText}\n\n` +
                    (user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : '') +
                    '**Memorize the sequence:**\n' +
                    formatSequence(sequence, user.sanity))
                    .setImage('attachment://tunnel.gif')
                    .addFields({ name: '🎯 Difficulty', value: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`, inline: true }, { name: '💫 Attempts', value: `${game.maxAttempts - game.attempts}/${game.maxAttempts}`, inline: true }, { name: '🧠 Sanity', value: `${(0, GAME_CONSTANTS_1.createProgressBar)(user.sanity, 100)} ${user.sanity}%`, inline: true })
                    .setFooter({ text: user.sanity < 50 ? 'T̷h̷e̶ ̷w̶a̵l̷l̴s̷ ̶s̷h̵i̷f̷t̵.̷.̶.' : 'Remember the pattern...' });
                await i.update({
                    embeds: [retryEmbed],
                    components: [],
                    files: [retryTunnelGifAttachment]
                });
                await new Promise(resolve => setTimeout(resolve, viewTime));
                await interaction.editReply({
                    embeds: [promptEmbed],
                    components: [buttonRow],
                    files: []
                });
                const newCollector = message.createMessageComponentCollector({
                    componentType: discord_js_1.ComponentType.Button,
                    time: 60000,
                    filter: i => i.user.id === interaction.user.id
                });
                newCollector.on('collect', async (i) => {
                    if (i.customId === 'show_sequence_modal') {
                        const modal = new discord_js_1.ModalBuilder()
                            .setCustomId('sequence_input')
                            .setTitle('Enter the Sequence')
                            .addComponents(new discord_js_1.ActionRowBuilder()
                            .addComponents(new discord_js_1.TextInputBuilder()
                            .setCustomId('sequence_answer')
                            .setLabel('Type the directions')
                            .setPlaceholder('Example: up right down left')
                            .setStyle(discord_js_1.TextInputStyle.Short)
                            .setRequired(true)
                            .setMinLength(2)
                            .setMaxLength(50)));
                        await i.showModal(modal);
                    }
                });
                newCollector.on('end', () => {
                    interaction.editReply({
                        components: []
                    }).catch(console.error);
                });
            }
        });
        collector.on('end', () => {
            interaction.editReply({
                components: []
            }).catch(console.error);
        });
        const modalFilter = (i) => i.customId === 'sequence_input' && i.user.id === interaction.user.id;
        interaction.awaitModalSubmit({ filter: modalFilter, time: 120000 })
            .then(async (submission) => {
            const answer = submission.fields.getTextInputValue('sequence_answer')
                .trim().toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ');
            const userMoves = answer.split(' ');
            const validDirections = ['up', 'down', 'left', 'right'];
            const isValidInput = userMoves.every(move => validDirections.includes(move));
            const correctLength = game.sequence.length;
            if (!isValidInput || userMoves.length !== correctLength) {
                const penaltyPoints = GAME_CONSTANTS_1.PUZZLE_REWARDS[game.difficulty].failure.meritPoints * 2;
                const sanityCost = GAME_CONSTANTS_1.PUZZLE_REWARDS[game.difficulty].failure.sanity * 1.5;
                await user_services_1.UserService.updateUserStats(interaction.user.id, {
                    meritPoints: user.meritPoints + penaltyPoints,
                    sanity: Math.max(user.sanity + sanityCost, 0),
                    suspiciousLevel: Math.min(user.suspiciousLevel + 15, 100),
                    totalGamesPlayed: user.totalGamesPlayed + 1,
                    currentStreak: 0
                });
                const failureEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(GAME_CONSTANTS_1.PRISON_COLORS.danger)
                    .setTitle('⚠️ Invalid Input')
                    .setDescription(`Your input must contain exactly ${correctLength} valid directions!\n` +
                    `Received: ${userMoves.length} directions | Expected: ${correctLength}\n` +
                    `Invalid entries: ${userMoves.filter(m => !validDirections.includes(m)).join(', ') || 'None'}`)
                    .addFields({
                    name: '📌 Requirements',
                    value: `• ${correctLength} directions\n• Valid options: up, down, left, right`
                });
                await submission.reply({ embeds: [failureEmbed], flags: [discord_js_1.MessageFlags.Ephemeral] });
                collector.stop();
                return;
            }
            let correctCount = 0;
            game.sequence.forEach((correctMove, index) => {
                if (userMoves[index] === correctMove)
                    correctCount++;
            });
            if (userMoves.length !== game.sequence.length) {
                const lengthEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(GAME_CONSTANTS_1.PRISON_COLORS.warning)
                    .setTitle('⚠️ Incorrect Length')
                    .setDescription(`Your sequence length (${userMoves.length}) doesn't match the required length (${game.sequence.length})!\n` +
                    `Please try again with exactly ${game.sequence.length} directions.`);
                await submission.reply({ embeds: [lengthEmbed], flags: [discord_js_1.MessageFlags.Ephemeral] });
                return;
            }
            const matchRatio = correctCount / sequence.length;
            const scorePercentage = Math.round(matchRatio * 100);
            const rewards = GAME_CONSTANTS_1.PUZZLE_REWARDS[game.difficulty];
            const isSuccess = scorePercentage >= 70;
            if (!isSuccess) {
                const penaltyPoints = rewards.failure.meritPoints * 1.5;
                const sanityCost = rewards.failure.sanity * 1.2;
                const suspicionIncrease = 8;
                await user_services_1.UserService.updateUserStats(interaction.user.id, {
                    meritPoints: user.meritPoints + penaltyPoints,
                    sanity: Math.min(Math.max(user.sanity + sanityCost, 0), 100),
                    suspiciousLevel: Math.min(user.suspiciousLevel + suspicionIncrease, 100),
                    totalGamesPlayed: user.totalGamesPlayed + 1,
                    totalGamesWon: user.totalGamesWon,
                    currentStreak: 0
                });
                const resultEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(GAME_CONSTANTS_1.PRISON_COLORS.danger)
                    .setTitle('🚫 Security Breach Detected')
                    .setDescription('Incorrect sequence entered. Security measures activated.\n\n' +
                    `Correct Sequence: ${formatSequence(game.sequence, 100)}\n` +
                    `Your Sequence: ${formatSequence(userMoves.slice(0, game.sequence.length), user.sanity)}\n` +
                    `Accuracy: ${scorePercentage}%`)
                    .addFields({
                    name: '📊 Penalties Applied',
                    value: `Merit Points: ${penaltyPoints}\n` +
                        `Sanity: ${sanityCost}\n` +
                        `Suspicion: +${suspicionIncrease}\n` +
                        `Streak: Reset to 0`
                })
                    .setFooter({ text: 'The system remembers your failure...' });
                await submission.editReply({ embeds: [resultEmbed], components: [] });
                collector.stop();
                return;
            }
            const meritChange = isSuccess ? rewards.success.meritPoints : rewards.failure.meritPoints;
            const sanityChange = isSuccess ? rewards.success.sanity : rewards.failure.sanity;
            const suspicionChange = scorePercentage < 30 ? 5 : 0;
            await Promise.all([
                user_services_1.UserService.updateUserStats(interaction.user.id, {
                    meritPoints: user.meritPoints + meritChange,
                    sanity: Math.min(Math.max(user.sanity + sanityChange, 0), 100),
                    suspiciousLevel: Math.min(user.suspiciousLevel + suspicionChange, 100),
                    totalGamesPlayed: user.totalGamesPlayed + 1,
                    totalGamesWon: user.totalGamesWon + (isSuccess ? 1 : 0),
                    currentStreak: isSuccess ? user.currentStreak + 1 : 0
                }),
                user_services_1.UserService.updatePuzzleProgress(interaction.user.id, 'tunnel1', isSuccess)
            ]);
            const resultEmbed = new discord_js_1.EmbedBuilder()
                .setColor(isSuccess ? GAME_CONSTANTS_1.PRISON_COLORS.success : GAME_CONSTANTS_1.PRISON_COLORS.danger)
                .setTitle(isSuccess ? '🌟 Tunnel Navigated!' : '💫 Lost in the Maze')
                .setDescription(`${isSuccess
                ? 'You found your way through the digital labyrinth!'
                : 'The path proved too treacherous...'}\n\n` +
                `Correct Sequence: ${formatSequence(game.sequence, 100)}\n` +
                `Your Sequence: ${formatSequence(userMoves.slice(0, game.sequence.length), user.sanity)}\n` +
                `Accuracy: ${scorePercentage}%`)
                .addFields({
                name: '📊 Results',
                value: `Merit Points: ${meritChange >= 0 ? '+' : ''}${meritChange}\n` +
                    `Sanity: ${sanityChange >= 0 ? '+' : ''}${sanityChange}\n` +
                    `Streak: ${isSuccess ? user.currentStreak + 1 : '0'}` +
                    (suspicionChange > 0 ? `\n⚠️ Suspicion: +${suspicionChange}` : '')
            })
                .setFooter({
                text: user.sanity < 30
                    ? 'T̷h̷e̶ ̷m̶a̵z̷e̴ ̷n̶e̷v̵e̷r̵ ̷e̶n̷d̵s̶.̷.̶.'
                    : isSuccess ? 'The path becomes clearer...' : 'The tunnels shift and change...'
            });
            await submission.reply({
                embeds: [resultEmbed],
            });
            collector.stop();
        })
            .catch(() => {
            interaction.followUp({
                content: 'You did not submit a sequence in time or an error occurred.',
                flags: [discord_js_1.MessageFlags.Ephemeral]
            }).catch(console.error);
        });
    }
});
function getRandomGlitchMessage() {
    return GAME_CONSTANTS_1.SANITY_EFFECTS.glitchMessages[Math.floor(Math.random() * GAME_CONSTANTS_1.SANITY_EFFECTS.glitchMessages.length)];
}
function getColorFromPrisonColor(colorKey) {
    return GAME_CONSTANTS_1.PRISON_COLORS[colorKey];
}
//# sourceMappingURL=tunnel-command-with-gif.js.map