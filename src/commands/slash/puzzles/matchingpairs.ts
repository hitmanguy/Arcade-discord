import { RegisterType, SlashCommand } from '../../../handler';
import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageFlags,
    ColorResolvable,
    AttachmentBuilder
} from 'discord.js';
import { User, UserDocument } from '../../../model/user_status';
import { UserService } from '../../../services/user_services';
import { STORYLINE, PRISON_COLORS, PUZZLE_REWARDS, SANITY_EFFECTS, createProgressBar } from '../../../constants/GAME_CONSTANTS';
import { join } from 'path';  // Add this import for path handling

interface Card {
    id: number;
    emoji: string;
    isFlipped: boolean;
    isMatched: boolean;
}

interface MatchingGame {
    cards: Card[];
    firstCard: Card | null;
    secondCard: Card | null;
    moves: number;
    matches: number;
    maxMoves: number;
    processingMatch: boolean; // Add this flag to track when we're processing a match
}

const CARD_EMOJIS = ['🌟', '🎯', '💫', '🔮', '⚡', '🎲', '🎪', '🎭'];

function createGame(difficulty: 'easy' | 'medium' | 'hard'): MatchingGame {
    const pairs = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
    const emojis = CARD_EMOJIS.slice(0, pairs);
    const cards: Card[] = [];
    
    // Create pairs of cards
    emojis.forEach((emoji, index) => {
        cards.push({ id: index * 2, emoji, isFlipped: false, isMatched: false });
        cards.push({ id: index * 2 + 1, emoji, isFlipped: false, isMatched: false });
    });
    
    // Shuffle cards
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
        maxMoves: pairs * 3, // Allow some extra moves based on difficulty
        processingMatch: false // Initialize the flag
    };
}

function createBoardEmbed(game: MatchingGame, user: UserDocument, difficulty: string): EmbedBuilder {
    const storylineData = STORYLINE.matchingpairs;
    const rows = Math.ceil(game.cards.length / 4);
    let boardDisplay = '';

    // Add glitch effect based on sanity
    const glitchEffect = user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : '';
    
    // Create board display
    for (let i = 0; i < rows; i++) {
        const rowCards = game.cards.slice(i * 4, (i + 1) * 4);
        boardDisplay += rowCards.map(card => {
            if (card.isMatched) return '✨';
            if (card.isFlipped) return card.emoji;
            // Add visual corruption at low sanity
            if (user.sanity < 30 && Math.random() < 0.2) {
                return ['❓', '❔', '⁉️', '‼️'][Math.floor(Math.random() * 4)];
            }
            return '❔';
        }).join(' ') + '\n';
    }

    return new EmbedBuilder()
        .setColor(user.sanity < 30 ? PRISON_COLORS.danger : PRISON_COLORS.primary)
        .setTitle('🎴 Memory Protocol')
        .setDescription(
            `${storylineData.flavorText}\n\n${glitchEffect}` +
            `**Board:**\n${boardDisplay}\n` +
            `Moves: ${game.moves}/${game.maxMoves} | Matches: ${game.matches}/${game.cards.length/2}`
        )
        .addFields(
            { name: '🎯 Difficulty', value: difficulty, inline: true },
            { name: '🧠 Sanity', value: `${createProgressBar(user.sanity, 100)} ${user.sanity}%`, inline: true }
        )
        .setFooter({ 
            text: user.sanity < 40 
                ? 'T̷h̷e̶ ̷s̶y̵m̷b̴o̷l̶s̷ ̵s̷h̵i̷f̷t̵.̷.̶.' 
                : 'Match the symbols before they fade...' 
        })
        // The GIF will be added when sending the message, not here
        // We'll reference it in the "image" property later
}

function createGameButtons(game: MatchingGame, user: UserDocument): ActionRowBuilder<ButtonBuilder>[] {
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const numRows = Math.ceil(game.cards.length / 4);
    
    for (let i = 0; i < numRows; i++) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        const rowCards = game.cards.slice(i * 4, (i + 1) * 4);
        
        rowCards.forEach(card => {
            const button = new ButtonBuilder()
                .setCustomId(`card_${card.id}`)
                .setStyle(
                    card.isMatched ? ButtonStyle.Success :
                    card.isFlipped ? ButtonStyle.Primary :
                    ButtonStyle.Secondary
                )
                // Use emoji instead of label for better visibility
                .setEmoji(card.isMatched ? '✨' : card.isFlipped ? card.emoji : '❔')
                .setDisabled(card.isMatched || card.isFlipped || 
                    game.processingMatch || // Use the processing flag to disable buttons
                    Boolean(game.firstCard && game.secondCard) // Disable all cards while checking pair
                );
            
            row.addComponents(button);
        });
        
        rows.push(row);
    }
    
    return rows;
}

export default new SlashCommand ({
    registerType: RegisterType.Guild,
    data: new SlashCommandBuilder()
        .setName('matching')
        .setDescription('Test your memory in the symbol matching protocol')
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('Choose your challenge level')
                .setRequired(true)
                .addChoices(
                    { name: '😌 Easy (4 pairs)', value: 'easy' },
                    { name: '😰 Medium (6 pairs)', value: 'medium' },
                    { name: '😱 Hard (8 pairs)', value: 'hard' }
                )
        ) as SlashCommandBuilder,
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({flags: [MessageFlags.Ephemeral]});

        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) {
            await interaction.editReply('You need to register first! Use `/register` to begin your journey.');
            return;
        }
        const suspicous = user.suspiciousLevel>50;
        if(suspicous){
          await interaction.editReply('You are too suspicious to play this game. Try again later.');
          return;
        }
            const merit = user.meritPoints;
            if(merit<100){
                await interaction.editReply('You dont have enough merit points to play this. You can play the previous game to earn more points');
                return;
            }
        user.survivalDays+=1;
        await user.save();
        // Check for isolation or high suspicion
        if (user.isInIsolation || user.suspiciousLevel >= 80) {
            const embed = new EmbedBuilder()
                .setColor(PRISON_COLORS.danger)
                .setTitle('⚠️ Access Denied')
                .setDescription(user.isInIsolation 
                    ? 'You are currently in isolation. Access to trials is restricted.'
                    : 'Your suspicious behavior has been noted. Access temporarily restricted.')
                .setFooter({ text: 'Try again when your status improves' });
            
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const difficulty = interaction.options.getString('difficulty', true) as 'easy' | 'medium' | 'hard';
        const game = createGame(difficulty);

        // Create the attachment for the memory GIF from local file
        const memoryGifPath = join(__dirname, '../../../Gifs/Memory.gif');
        const memoryGifAttachment = new AttachmentBuilder(memoryGifPath, { name: 'Memory.gif' });

        // Initial board display
        const embed = createBoardEmbed(game, user, difficulty)
            .setImage('attachment://Memory.gif'); // Add the GIF to the embed
        const components = createGameButtons(game, user);
        
        const message = await interaction.editReply({
            embeds: [embed],
            files: [memoryGifAttachment], // Include the GIF file
            components: components
        });

        // Set up collector for button interactions
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 180000 // 3 minutes
        });

        collector.on('collect', async (btnInteraction) => {
            // Handle cases where someone else clicks the button
            if (btnInteraction.user.id !== interaction.user.id) {
                await btnInteraction.reply({
                    content: 'These symbols aren\'t meant for you...',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            try {
                // Get the card ID from the button
                const cardId = parseInt(btnInteraction.customId.split('_')[1]);
                const card = game.cards.find(c => c.id === cardId);
                
                // Skip if card is invalid, matched, flipped, or game is processing a match
                if (!card || card.isMatched || card.isFlipped || game.processingMatch) {
                    await btnInteraction.deferUpdate();
                    return;
                }

                // Flip the card
                card.isFlipped = true;

                if (!game.firstCard) {
                    // First card selected
                    game.firstCard = card;
                    await btnInteraction.update({
                        embeds: [createBoardEmbed(game, user, difficulty).setImage('attachment://Memory.gif')],
                        components: createGameButtons(game, user)
                    });
                } else {
                    // Second card selected
                    game.secondCard = card;
                    game.moves++;
                    game.processingMatch = true;  // Set the processing flag
                    
                    // First, update to show both cards
                    await btnInteraction.update({
                        embeds: [createBoardEmbed(game, user, difficulty).setImage('attachment://Memory.gif')],
                        components: createGameButtons(game, user)
                    });

                    // Wait a moment to let player see the cards
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Check if cards match
                    if (game.firstCard.emoji === game.secondCard.emoji) {
                        game.firstCard.isMatched = true;
                        game.secondCard.isMatched = true;
                        game.matches++;
                    } else {
                        game.firstCard.isFlipped = false;
                        game.secondCard.isFlipped = false;
                    }

                    // Reset card selection
                    game.firstCard = null;
                    game.secondCard = null;
                    
                    // Check if game is over
                    const isGameOver = game.matches === game.cards.length / 2 || game.moves >= game.maxMoves;
                    const isSuccess = game.matches === game.cards.length / 2;
                    
                    if (isGameOver) {
                        collector.stop();

                        // Calculate rewards based on performance
                        const baseReward = PUZZLE_REWARDS[difficulty];
                        const performanceRatio = game.matches / (game.cards.length / 2);
                        const meritChange = isSuccess 
                            ? Math.round(baseReward.success.meritPoints * (1 + performanceRatio / 2))
                            : baseReward.failure.meritPoints;
                        const sanityChange = isSuccess
                            ? baseReward.success.sanity
                            : Math.round(baseReward.failure.sanity * (1 - performanceRatio));

                        // Add suspicion for suspicious patterns
                        let suspicionChange = 0;
                        if (game.moves < game.matches * 2) { // Suspiciously good performance
                            suspicionChange = Math.min(15, 10);
                        }

                        // Update user stats
                        await Promise.all([
                            UserService.updateUserStats(interaction.user.id, {
                                meritPoints: user.meritPoints + meritChange,
                                sanity: Math.min(Math.max(user.sanity + sanityChange, 0), 100),
                                suspiciousLevel: Math.min(user.suspiciousLevel + suspicionChange, 100),
                                totalGamesPlayed: user.totalGamesPlayed + 1,
                                totalGamesWon: user.totalGamesWon + (isSuccess ? 1 : 0),
                                currentStreak: isSuccess ? user.currentStreak + 1 : 0
                            }),
                            UserService.updatePuzzleProgress(interaction.user.id, 'matchingpairs', isSuccess)
                        ]);

                        // Create a new attachment for the result screen
                        const memoryGifAttachment = new AttachmentBuilder(memoryGifPath, { name: 'Memory.gif' });

                        // Final result embed
                        const resultEmbed = new EmbedBuilder()
                            .setColor(isSuccess ? PRISON_COLORS.success : PRISON_COLORS.danger)
                            .setTitle(isSuccess ? '🌟 Memory Protocol Complete!' : '💫 Protocol Failed')
                            .setDescription(
                                `${isSuccess 
                                    ? 'Your mind proves sharp as steel!'
                                    : 'The symbols fade into darkness...'}\n\n` +
                                `Matches: ${game.matches}/${game.cards.length/2}\n` +
                                `Moves Used: ${game.moves}/${game.maxMoves}`
                            )
                            .addFields({
                                name: '📊 Results',
                                value: 
                                    `Merit Points: ${meritChange >= 0 ? '+' : ''}${meritChange}\n` +
                                    `Sanity: ${sanityChange >= 0 ? '+' : ''}${sanityChange}\n` +
                                    `Streak: ${isSuccess ? user.currentStreak + 1 : '0'}` +
                                    (suspicionChange > 0 ? `\n⚠️ Suspicion: +${suspicionChange}` : '')
                            })
                            .setImage('attachment://Memory.gif') // Include the GIF in the result screen
                            .setFooter({ 
                                text: user.sanity < 30 
                                    ? 'T̷h̷e̶ ̷s̶y̵m̷b̴o̷l̶s̷ ̵h̷a̵u̷n̷t̵ ̷y̶o̵u̷.̶.̶.' 
                                    : isSuccess ? 'Your memory grows stronger...' : 'The patterns slip away...' 
                            });

                        // Edit original interaction message since the collector is stopping
                        await interaction.editReply({
                            embeds: [resultEmbed],
                            files: [memoryGifAttachment], // Include the GIF file
                            components: []
                        });
                    } else {
                        // Game continues - update the board
                        game.processingMatch = false;  // Reset the processing flag
                        
                        // Use the original interaction to edit the message
                        // We need to include the attachment again when updating
                        const memoryGifAttachment = new AttachmentBuilder(memoryGifPath, { name: 'Memory.gif' });
                        
                        await interaction.editReply({
                            embeds: [createBoardEmbed(game, user, difficulty).setImage('attachment://Memory.gif')],
                            files: [memoryGifAttachment],
                            components: createGameButtons(game, user)
                        });
                    }
                }
            } catch (error) {
                console.error('Error handling button interaction:', error);
                // Try to acknowledge the interaction to prevent Discord API errors
                try {
                    await btnInteraction.deferUpdate();
                } catch (e) {
                    // Ignore if this also fails
                }
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                // Create a new attachment for the timeout screen
                const memoryGifAttachment = new AttachmentBuilder(memoryGifPath, { name: 'Memory.gif' });
                
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(PRISON_COLORS.warning)
                    .setTitle('⏰ Time\'s Up!')
                    .setDescription(user.sanity < 40 
                        ? 'T̵i̸m̵e̵ ̸d̵i̷s̷s̴o̵l̶v̷e̷s̴ ̶i̵n̷t̵o̷ ̵s̶h̴a̵d̷o̵w̴s̶.̷.̶.'
                        : 'The symbols fade into the void...\nPerhaps speed is as important as memory.'
                    )
                    .setImage('attachment://Memory.gif')
                    .setFooter({ text: 'Try another round with /matching' });

                try {
                    await interaction.editReply({
                        embeds: [timeoutEmbed],
                        files: [memoryGifAttachment],
                        components: []
                    });
                } catch (error) {
                    console.error('Error updating timeout message:', error);
                }

                // Penalize for timeout
                await UserService.updateUserStats(interaction.user.id, {
                    sanity: Math.max(user.sanity - 2, 0),
                    currentStreak: 0
                });
            }
        });
    }
});

function getRandomGlitchMessage(): string {
    return SANITY_EFFECTS.glitchMessages[
        Math.floor(Math.random() * SANITY_EFFECTS.glitchMessages.length)
    ];
}

function getColorFromPrisonColor(colorKey: keyof typeof PRISON_COLORS): ColorResolvable {
    return PRISON_COLORS[colorKey] as ColorResolvable;
}