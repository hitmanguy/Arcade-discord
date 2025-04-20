import { RegisterType, SlashCommand } from '../../../handler';
import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ComponentType,
    ModalSubmitInteraction,
    MessageFlags
} from 'discord.js';
import { User, UserDocument } from '../../../model/user_status';
import { UserService } from '../../../services/user_services';
import { STORYLINE, PRISON_COLORS, PUZZLE_REWARDS, SANITY_EFFECTS, createProgressBar } from '../../../constants/GAME_CONSTANTS';

// Sequence generation helpers
const DIRECTIONS = ['up', 'down', 'left', 'right'];
const DIRECTION_EMOJIS = {
    up: '⬆️',
    down: '⬇️',
    left: '⬅️',
    right: '➡️'
};

interface TunnelGame {
    sequence: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    attempts: number;
    maxAttempts: number;
}

function generateSequence(difficulty: 'easy' | 'medium' | 'hard'): string[] {
    const lengths = { easy: 4, medium: 6, hard: 8 };
    const length = lengths[difficulty];
    const sequence: string[] = [];
    
    for (let i = 0; i < length; i++) {
        sequence.push(DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]);
    }
    
    return sequence;
}

function formatSequence(sequence: string[], sanity: number): string {
    let formatted = sequence.map(dir => DIRECTION_EMOJIS[dir as keyof typeof DIRECTION_EMOJIS]).join(' ');
    
    // Apply visual distortions based on sanity
    if (sanity < 50) {
        const glitchChance = (100 - sanity) / 100;
        const arrows = Object.values(DIRECTION_EMOJIS);
        formatted = formatted.split(' ').map(arrow => 
            Math.random() < glitchChance ? 
                arrows[Math.floor(Math.random() * arrows.length)] : 
                arrow
        ).join(' ');
    }
    
    return formatted;
}

export default new SlashCommand({
    registerType: RegisterType.Guild,
    data: new SlashCommandBuilder()
        .setName('tunnel')
        .setDescription('Navigate through the digital maze')
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('Choose your challenge level')
                .setRequired(true)
                .addChoices(
                    { name: '😌 Easy (4 steps)', value: 'easy' },
                    { name: '😰 Medium (6 steps)', value: 'medium' },
                    { name: '😱 Hard (8 steps)', value: 'hard' }
                )) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) {
            await interaction.editReply('You need to register first! Use `/register` to begin your journey.');
            return;
        }

        const requiredPuzzles = ['puzzles1'];
        const completedPuzzles = user.puzzleProgress.filter(p => requiredPuzzles.includes(p.puzzleId) && p.completed);
        
        // Add type guard for storyline entries
        function isStorylineEntry(value: any): value is { name: string; description: string; flavorText: string } {
            return value && typeof value === 'object' && 'name' in value;
        }

        // Update the progress display with proper type checking
        if (completedPuzzles.length < requiredPuzzles.length) {
            await interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(getColorFromPrisonColor('danger'))
                    .setTitle('⚠️ Access Denied')
                    .setDescription('The Judas Protocol requires mastery of simpler trials first.')
                    .addFields({
                        name: 'Required Trials',
                        value: requiredPuzzles.map(id => {
                            const completed = user.puzzleProgress.find(p => p.puzzleId === id)?.completed;
                            const storylineEntry = STORYLINE[id as keyof typeof STORYLINE];
                            const name = isStorylineEntry(storylineEntry) ? storylineEntry.name : id;
                            return `${completed ? '✅' : '❌'} ${name}`;
                        }).join('\n')
                    })],
                ephemeral: true
            });
            return;
        }

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
        const sequence = generateSequence(difficulty);
        const game: TunnelGame = {
            sequence,
            difficulty,
            attempts: 0,
            maxAttempts: difficulty === 'easy' ? 3 : difficulty === 'medium' ? 2 : 1
        };

        // Create initial embed with storyline integration
        const storylineData = STORYLINE.tunnel1;
        const initialEmbed = new EmbedBuilder()
            .setColor(user.sanity < 30 ? PRISON_COLORS.danger : PRISON_COLORS.primary)
            .setTitle('🌀 The Digital Tunnel')
            .setDescription(
                `${storylineData.flavorText}\n\n` +
                (user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : '') +
                '**Memorize the sequence:**\n' +
                formatSequence(sequence, user.sanity)
            )
            .addFields(
                { name: '🎯 Difficulty', value: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`, inline: true },
                { name: '💫 Attempts', value: `${game.maxAttempts}`, inline: true },
                { name: '🧠 Sanity', value: `${createProgressBar(user.sanity, 100)} ${user.sanity}%`, inline: true }
            )
            .setFooter({ text: user.sanity < 50 ? 'T̷h̷e̶ ̷w̶a̵l̷l̴s̷ ̶s̷h̵i̷f̷t̵.̷.̶.' : 'Remember the pattern...' });

        // Send initial message with sequence
        const message = await interaction.editReply({ embeds: [initialEmbed] });

        // Wait for view time (adjusted based on sanity)
        const viewTime = Math.max(2000, Math.min(5000, user.sanity * 50));
        await new Promise(resolve => setTimeout(resolve, viewTime));

        // Update message to prompt for input
        const promptEmbed = new EmbedBuilder()
            .setColor(PRISON_COLORS.primary)
            .setTitle('🌀 Enter the Sequence')
            .setDescription(
                user.sanity < 40 ?
                'T̷h̶e̷ ̵p̷a̴t̵h̷ ̵t̶w̷i̸s̷t̴s̷ ̵i̸n̵ ̷y̵o̷u̶r̵ ̴m̶i̶n̸d̸.̶.̵.' :
                'The sequence vanishes... What path did you see?'
            );

        // Create button to show modal
        const buttonRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('show_sequence_modal')
                    .setLabel('Enter Sequence')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.editReply({
            embeds: [promptEmbed],
            components: [buttonRow]
        });

        // Create collector for the button
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000, // 1 minute timeout
            filter: i => i.user.id === interaction.user.id
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'show_sequence_modal') {
                const modal = new ModalBuilder()
                    .setCustomId('sequence_input')
                    .setTitle('Enter the Sequence')
                    .addComponents(
                        new ActionRowBuilder<TextInputBuilder>()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId('sequence_answer')
                                    .setLabel('Type the directions')
                                    .setPlaceholder('Example: up right down left')
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                                    .setMinLength(2)
                                    .setMaxLength(50)
                            )
                    );
                
                await i.showModal(modal);
            } else if (i.customId === 'retry_tunnel') {
                // Handle retry
                game.attempts++;
                collector.stop();
                
                // Show sequence again
                const retryEmbed = new EmbedBuilder()
                    .setColor(user.sanity < 30 ? PRISON_COLORS.danger : PRISON_COLORS.primary)
                    .setTitle('🌀 The Digital Tunnel - Retry')
                    .setDescription(
                        `${storylineData.flavorText}\n\n` +
                        (user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : '') +
                        '**Memorize the sequence:**\n' +
                        formatSequence(sequence, user.sanity)
                    )
                    .addFields(
                        { name: '🎯 Difficulty', value: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`, inline: true },
                        { name: '💫 Attempts', value: `${game.maxAttempts - game.attempts}/${game.maxAttempts}`, inline: true },
                        { name: '🧠 Sanity', value: `${createProgressBar(user.sanity, 100)} ${user.sanity}%`, inline: true }
                    )
                    .setFooter({ text: user.sanity < 50 ? 'T̷h̷e̶ ̷w̶a̵l̷l̴s̷ ̶s̷h̵i̷f̷t̵.̷.̶.' : 'Remember the pattern...' });
                
                await i.update({ embeds: [retryEmbed], components: [] });
                
                // Wait for view time
                await new Promise(resolve => setTimeout(resolve, viewTime));
                
                // Show button to enter sequence again
                await interaction.editReply({
                    embeds: [promptEmbed],
                    components: [buttonRow]
                });
                
                // Set up a new collector
                const newCollector = message.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 60000,
                    filter: i => i.user.id === interaction.user.id
                });
                
                newCollector.on('collect', async (i) => {
                    if (i.customId === 'show_sequence_modal') {
                        const modal = new ModalBuilder()
                            .setCustomId('sequence_input')
                            .setTitle('Enter the Sequence')
                            .addComponents(
                                new ActionRowBuilder<TextInputBuilder>()
                                    .addComponents(
                                        new TextInputBuilder()
                                            .setCustomId('sequence_answer')
                                            .setLabel('Type the directions')
                                            .setPlaceholder('Example: up right down left')
                                            .setStyle(TextInputStyle.Short)
                                            .setRequired(true)
                                            .setMinLength(2)
                                            .setMaxLength(50)
                                    )
                            );
                        
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
            // Remove button when collector ends without retry
            interaction.editReply({
                components: []
            }).catch(console.error);
        });

        // Watch for modal submissions
        const modalFilter = (i: ModalSubmitInteraction) => i.customId === 'sequence_input' && i.user.id === interaction.user.id;
        
        interaction.awaitModalSubmit({ filter: modalFilter, time: 120000 })
    .then(async submission => {
        // Properly defer the modal response
        await submission.deferReply({ flags: MessageFlags.Ephemeral });

        // Process answer
        const answer = submission.fields.getTextInputValue('sequence_answer')
            .trim().toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ');
        
        // Validate input
        const userMoves = answer.split(' ');
        const validDirections = ['up', 'down', 'left', 'right'];
        const isValidInput = userMoves.every(move => validDirections.includes(move));
        const correctLength = game.sequence.length;

        // Enhanced validation
        if (!isValidInput || userMoves.length !== correctLength) {
            const penaltyPoints = PUZZLE_REWARDS[game.difficulty].failure.meritPoints * 2;
            const sanityCost = PUZZLE_REWARDS[game.difficulty].failure.sanity * 1.5;

            await UserService.updateUserStats(interaction.user.id, {
                meritPoints: user.meritPoints + penaltyPoints,
                sanity: Math.max(user.sanity + sanityCost, 0),
                suspiciousLevel: Math.min(user.suspiciousLevel + 15, 100),
                totalGamesPlayed: user.totalGamesPlayed + 1,
                currentStreak: 0
            });

            const failureEmbed = new EmbedBuilder()
                .setColor(PRISON_COLORS.danger)
                .setTitle('⚠️ Invalid Input')
                .setDescription(
                    `Your input must contain exactly ${correctLength} valid directions!\n` +
                    `Received: ${userMoves.length} directions | Expected: ${correctLength}\n` +
                    `Invalid entries: ${userMoves.filter(m => !validDirections.includes(m)).join(', ') || 'None'}`
                )
                .addFields({
                    name: '📌 Requirements',
                    value: `• ${correctLength} directions\n• Valid options: up, down, left, right`
                });

                    await submission.editReply({ embeds: [failureEmbed] });
                    collector.stop();
                    return;
                }

                // Process correct answer
                let correctCount = 0;
                game.sequence.forEach((correctMove, index) => {
                    if (userMoves[index] === correctMove) correctCount++;
                });

                                // Add this validation check before processing the answer
                if (userMoves.length !== game.sequence.length) {
                    const lengthEmbed = new EmbedBuilder()
                        .setColor(PRISON_COLORS.warning)
                        .setTitle('⚠️ Incorrect Length')
                        .setDescription(
                            `Your sequence length (${userMoves.length}) doesn't match the required length (${game.sequence.length})!\n` +
                            `Please try again with exactly ${game.sequence.length} directions.`
                        );
                    
                    await submission.editReply({ embeds: [lengthEmbed] });
                    return;
                }

                
                const matchRatio = correctCount / sequence.length;
                const scorePercentage = Math.round(matchRatio * 100);
                
                // Calculate rewards
                const rewards = PUZZLE_REWARDS[game.difficulty];
                const isSuccess = scorePercentage >= 70;
                // For wrong sequences (where scorePercentage < 70), modify the rewards calculation:
                    if (!isSuccess) {
                        const penaltyPoints = rewards.failure.meritPoints * 1.5; // 50% more penalty
                        const sanityCost = rewards.failure.sanity * 1.2; // 20% more sanity loss
                        const suspicionIncrease = 8; // Higher suspicion for failure

                        // Update user stats with increased penalties
                        await UserService.updateUserStats(interaction.user.id, {
                            meritPoints: user.meritPoints + penaltyPoints,
                            sanity: Math.min(Math.max(user.sanity + sanityCost, 0), 100),
                            suspiciousLevel: Math.min(user.suspiciousLevel + suspicionIncrease, 100),
                            totalGamesPlayed: user.totalGamesPlayed + 1,
                            totalGamesWon: user.totalGamesWon,
                            currentStreak: 0
                        });
                        
                        // Remove retry option - game over on first fail
                        const resultEmbed = new EmbedBuilder()
                            .setColor(PRISON_COLORS.danger)
                            .setTitle('🚫 Security Breach Detected')
                            .setDescription(
                                'Incorrect sequence entered. Security measures activated.\n\n' +
                                `Correct Sequence: ${formatSequence(game.sequence, 100)}\n` +
                                `Your Sequence: ${formatSequence(userMoves.slice(0, game.sequence.length), user.sanity)}\n` +
                                `Accuracy: ${scorePercentage}%`
                            )
                            .addFields({
                                name: '📊 Penalties Applied',
                                value: 
                                    `Merit Points: ${penaltyPoints}\n` +
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
                
                // Add suspicion for very poor performance
                const suspicionChange = scorePercentage < 30 ? 5 : 0;
                
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
                    UserService.updatePuzzleProgress(interaction.user.id, 'tunnel1', isSuccess)
                ]);
                
                // Create result embed
                const resultEmbed = new EmbedBuilder()
                    .setColor(isSuccess ? PRISON_COLORS.success : PRISON_COLORS.danger)
                    .setTitle(isSuccess ? '🌟 Tunnel Navigated!' : '💫 Lost in the Maze')
                    .setDescription(
                        `${isSuccess 
                            ? 'You found your way through the digital labyrinth!'
                            : 'The path proved too treacherous...'}\n\n` +
                        `Correct Sequence: ${formatSequence(game.sequence, 100)}\n` +
                        `Your Sequence: ${formatSequence(userMoves.slice(0, game.sequence.length), user.sanity)}\n` +
                        `Accuracy: ${scorePercentage}%`
                    )
                    .addFields({
                        name: '📊 Results',
                        value: 
                            `Merit Points: ${meritChange >= 0 ? '+' : ''}${meritChange}\n` +
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
                // Handle timeout or error
                interaction.followUp({
                    content: 'You did not submit a sequence in time or an error occurred.',
                    flags: [MessageFlags.Ephemeral]
                }).catch(console.error);
            });
    }
});

function getRandomGlitchMessage(): string {
    return SANITY_EFFECTS.glitchMessages[
        Math.floor(Math.random() * SANITY_EFFECTS.glitchMessages.length)
    ];
}
function getColorFromPrisonColor(arg0: string): import("discord.js").ColorResolvable | null {
    throw new Error('Function not implemented.');
}

