"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../../handler");
const discord_js_1 = require("discord.js");
const fs_1 = require("fs");
const user_status_1 = require("../../../model/user_status");
const user_services_1 = require("../../../services/user_services");
const GAME_CONSTANTS_1 = require("../../../constants/GAME_CONSTANTS");
const path_1 = require("path");
async function getMemoryAttachment() {
    const memoryGifPath = (0, path_1.join)(__dirname, '..', '..', '..', '..', 'gif', 'Memory.gif');
    try {
        await fs_1.promises.access(memoryGifPath);
        return new discord_js_1.AttachmentBuilder(memoryGifPath, { name: 'Memory.gif' });
    }
    catch (error) {
        console.error('Memory GIF not found:', error);
        console.error('Attempted path:', memoryGifPath);
        return null;
    }
}
const CARD_EMOJIS = ['🌟', '🎯', '💫', '🔮', '⚡', '🎲', '🎪', '🎭'];
function createGame(difficulty) {
    const pairs = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
    const emojis = CARD_EMOJIS.slice(0, pairs);
    const cards = [];
    emojis.forEach((emoji, index) => {
        cards.push({ id: index * 2, emoji, isFlipped: false, isMatched: false });
        cards.push({ id: index * 2 + 1, emoji, isFlipped: false, isMatched: false });
    });
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return {
        cards,
        firstCard: null,
        secondCard: null,
        moves: 0,
        matches: 0,
        maxMoves: pairs * 3,
        processingMatch: false
    };
}
function createBoardEmbed(game, user, difficulty) {
    const storylineData = GAME_CONSTANTS_1.STORYLINE.matchingpairs;
    const rows = Math.ceil(game.cards.length / 4);
    let boardDisplay = '';
    const glitchEffect = user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : '';
    for (let i = 0; i < rows; i++) {
        const rowCards = game.cards.slice(i * 4, (i + 1) * 4);
        boardDisplay += rowCards.map(card => {
            if (card.isMatched)
                return '✨';
            if (card.isFlipped)
                return card.emoji;
            if (user.sanity < 30 && Math.random() < 0.2) {
                return ['❓', '❔', '⁉️', '‼️'][Math.floor(Math.random() * 4)];
            }
            return '❔';
        }).join(' ') + '\n';
    }
    return new discord_js_1.EmbedBuilder()
        .setColor(user.sanity < 30 ? GAME_CONSTANTS_1.PRISON_COLORS.danger : GAME_CONSTANTS_1.PRISON_COLORS.primary)
        .setTitle('🎴 Memory Protocol')
        .setDescription(`${storylineData.flavorText}\n\n${glitchEffect}` +
        `**Board:**\n${boardDisplay}\n` +
        `Moves: ${game.moves}/${game.maxMoves} | Matches: ${game.matches}/${game.cards.length / 2}`)
        .addFields({ name: '🎯 Difficulty', value: difficulty, inline: true }, { name: '🧠 Sanity', value: `${(0, GAME_CONSTANTS_1.createProgressBar)(user.sanity, 100)} ${user.sanity}%`, inline: true })
        .setFooter({
        text: user.sanity < 40
            ? 'T̷h̷e̶ ̷s̶y̵m̷b̴o̷l̶s̷ ̵s̷h̵i̷f̷t̵.̷.̶.'
            : 'Match the symbols before they fade...'
    });
}
function createGameButtons(game, user) {
    const rows = [];
    const numRows = Math.ceil(game.cards.length / 4);
    for (let i = 0; i < numRows; i++) {
        const row = new discord_js_1.ActionRowBuilder();
        const rowCards = game.cards.slice(i * 4, (i + 1) * 4);
        rowCards.forEach(card => {
            const button = new discord_js_1.ButtonBuilder()
                .setCustomId(`card_${card.id}`)
                .setStyle(card.isMatched ? discord_js_1.ButtonStyle.Success :
                card.isFlipped ? discord_js_1.ButtonStyle.Primary :
                    discord_js_1.ButtonStyle.Secondary)
                .setEmoji(card.isMatched ? '✨' : card.isFlipped ? card.emoji : '❔')
                .setDisabled(card.isMatched || card.isFlipped ||
                game.processingMatch ||
                Boolean(game.firstCard && game.secondCard));
            row.addComponents(button);
        });
        rows.push(row);
    }
    return rows;
}
exports.default = new handler_1.SlashCommand({
    registerType: handler_1.RegisterType.Guild,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('matching')
        .setDescription('Test your memory in the symbol matching protocol')
        .addStringOption(option => option.setName('difficulty')
        .setDescription('Choose your challenge level')
        .setRequired(true)
        .addChoices({ name: '😌 Easy (4 pairs)', value: 'easy' }, { name: '😰 Medium (6 pairs)', value: 'medium' }, { name: '😱 Hard (8 pairs)', value: 'hard' })),
    async execute(interaction) {
        await interaction.deferReply({ flags: [discord_js_1.MessageFlags.Ephemeral] });
        const user = await user_status_1.User.findOne({ discordId: interaction.user.id });
        if (!user) {
            await interaction.editReply('You need to register first! Use `/register` to begin your journey.');
            return;
        }
        const suspicous = user.suspiciousLevel > 50;
        if (suspicous) {
            await interaction.editReply('You are too suspicious to play this game. Try again later.');
            return;
        }
        const merit = user.meritPoints;
        if (merit < 100) {
            await interaction.editReply('You dont have enough merit points to play this. You can play the previous game to earn more points');
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
        const game = createGame(difficulty);
        const memoryGifAttachment = await getMemoryAttachment();
        const embed = createBoardEmbed(game, user, difficulty);
        if (memoryGifAttachment) {
            embed.setImage('attachment://Memory.gif');
        }
        const components = createGameButtons(game, user);
        const message = await interaction.editReply({
            embeds: [embed],
            ...(memoryGifAttachment ? { files: [memoryGifAttachment] } : {}),
            components: components
        });
        const collector = message.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            time: 180000
        });
        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== interaction.user.id) {
                await btnInteraction.reply({
                    content: 'These symbols aren\'t meant for you...',
                    flags: [discord_js_1.MessageFlags.Ephemeral]
                });
                return;
            }
            try {
                const cardId = parseInt(btnInteraction.customId.split('_')[1]);
                const card = game.cards.find(c => c.id === cardId);
                if (!card || card.isMatched || card.isFlipped || game.processingMatch) {
                    await btnInteraction.deferUpdate();
                    return;
                }
                card.isFlipped = true;
                if (!game.firstCard) {
                    game.firstCard = card;
                    await btnInteraction.update({
                        embeds: [createBoardEmbed(game, user, difficulty).setImage('attachment://Memory.gif')],
                        components: createGameButtons(game, user)
                    });
                }
                else {
                    game.secondCard = card;
                    game.moves++;
                    game.processingMatch = true;
                    await btnInteraction.update({
                        embeds: [createBoardEmbed(game, user, difficulty).setImage('attachment://Memory.gif')],
                        components: createGameButtons(game, user)
                    });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    if (game.firstCard.emoji === game.secondCard.emoji) {
                        game.firstCard.isMatched = true;
                        game.secondCard.isMatched = true;
                        game.matches++;
                    }
                    else {
                        game.firstCard.isFlipped = false;
                        game.secondCard.isFlipped = false;
                    }
                    game.firstCard = null;
                    game.secondCard = null;
                    const isGameOver = game.matches === game.cards.length / 2 || game.moves >= game.maxMoves;
                    const isSuccess = game.matches === game.cards.length / 2;
                    if (isGameOver) {
                        collector.stop();
                        const baseReward = GAME_CONSTANTS_1.PUZZLE_REWARDS[difficulty];
                        const performanceRatio = game.matches / (game.cards.length / 2);
                        const meritChange = isSuccess
                            ? Math.round(baseReward.success.meritPoints * (1 + performanceRatio / 2))
                            : baseReward.failure.meritPoints;
                        const sanityChange = isSuccess
                            ? baseReward.success.sanity
                            : Math.round(baseReward.failure.sanity * (1 - performanceRatio));
                        let suspicionChange = 0;
                        if (game.moves < game.matches * 2) {
                            suspicionChange = Math.min(15, 10);
                        }
                        await Promise.all([
                            user_services_1.UserService.updateUserStats(interaction.user.id, {
                                meritPoints: user.meritPoints + meritChange,
                                sanity: Math.min(Math.max(user.sanity + sanityChange, 0), 100),
                                suspiciousLevel: Math.min(user.suspiciousLevel + suspicionChange, 100),
                                totalGamesPlayed: user.totalGamesPlayed + 1,
                                totalGamesWon: user.totalGamesWon + (isSuccess ? 1 : 0),
                                currentStreak: isSuccess ? user.currentStreak + 1 : 0
                            }),
                            user_services_1.UserService.updatePuzzleProgress(interaction.user.id, 'matchingpairs', isSuccess)
                        ]);
                        const memoryGifAttachment = await getMemoryAttachment();
                        const resultEmbed = new discord_js_1.EmbedBuilder()
                            .setColor(isSuccess ? GAME_CONSTANTS_1.PRISON_COLORS.success : GAME_CONSTANTS_1.PRISON_COLORS.danger)
                            .setTitle(isSuccess ? '🌟 Memory Protocol Complete!' : '💫 Protocol Failed')
                            .setDescription(`${isSuccess
                            ? 'Your mind proves sharp as steel!'
                            : 'The symbols fade into darkness...'}\n\n` +
                            `Matches: ${game.matches}/${game.cards.length / 2}\n` +
                            `Moves Used: ${game.moves}/${game.maxMoves}`)
                            .addFields({
                            name: '📊 Results',
                            value: `Merit Points: ${meritChange >= 0 ? '+' : ''}${meritChange}\n` +
                                `Sanity: ${sanityChange >= 0 ? '+' : ''}${sanityChange}\n` +
                                `Streak: ${isSuccess ? user.currentStreak + 1 : '0'}` +
                                (suspicionChange > 0 ? `\n⚠️ Suspicion: +${suspicionChange}` : '')
                        })
                            .setFooter({
                            text: user.sanity < 30
                                ? 'T̷h̷e̶ ̷s̶y̵m̷b̴o̷l̶s̷ ̵h̷a̵u̷n̷t̵ ̷y̶o̵u̷.̶.̶.'
                                : isSuccess ? 'Your memory grows stronger...' : 'The patterns slip away...'
                        });
                        if (memoryGifAttachment) {
                            resultEmbed.setImage('attachment://Memory.gif');
                        }
                        await interaction.editReply({
                            embeds: [resultEmbed],
                            ...(memoryGifAttachment ? { files: [memoryGifAttachment] } : {}),
                            components: []
                        });
                    }
                    else {
                        game.processingMatch = false;
                        const memoryGifAttachment = await getMemoryAttachment();
                        await interaction.editReply({
                            embeds: [createBoardEmbed(game, user, difficulty).setImage('attachment://Memory.gif')],
                            ...(memoryGifAttachment ? { files: [memoryGifAttachment] } : {}),
                            components: createGameButtons(game, user)
                        });
                    }
                }
            }
            catch (error) {
                console.error('Error handling button interaction:', error);
                try {
                    await btnInteraction.deferUpdate();
                }
                catch (e) {
                }
            }
        });
        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                const memoryGifAttachment = await getMemoryAttachment();
                const timeoutEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(GAME_CONSTANTS_1.PRISON_COLORS.warning)
                    .setTitle('⏰ Time\'s Up!')
                    .setDescription(user.sanity < 40
                    ? 'T̵i̸m̵e̵ ̸d̵i̷s̷s̴o̵l̶v̷e̷s̴ ̶i̵n̷t̵o̷ ̵s̶h̴a̵d̷o̵w̴s̶.̷.̶.'
                    : 'The symbols fade into the void...\nPerhaps speed is as important as memory.')
                    .setImage('attachment://Memory.gif')
                    .setFooter({ text: 'Try another round with /matching' });
                if (memoryGifAttachment) {
                    embed.setImage('attachment://Memory.gif');
                }
                try {
                    await interaction.editReply({
                        embeds: [timeoutEmbed],
                        ...(memoryGifAttachment ? { files: [memoryGifAttachment] } : {}),
                        components: []
                    });
                }
                catch (error) {
                    console.error('Error updating timeout message:', error);
                }
                await user_services_1.UserService.updateUserStats(interaction.user.id, {
                    sanity: Math.max(user.sanity - 2, 0),
                    currentStreak: 0
                });
            }
        });
    }
});
function getRandomGlitchMessage() {
    return GAME_CONSTANTS_1.SANITY_EFFECTS.glitchMessages[Math.floor(Math.random() * GAME_CONSTANTS_1.SANITY_EFFECTS.glitchMessages.length)];
}
function getColorFromPrisonColor(colorKey) {
    return GAME_CONSTANTS_1.PRISON_COLORS[colorKey];
}
//# sourceMappingURL=matchingpairs.js.map