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
    MessageFlags,
    ColorResolvable,
    AttachmentBuilder
} from 'discord.js';
import { User, UserDocument } from '../../../model/user_status';
import { UserService } from '../../../services/user_services';
import { STORYLINE, PRISON_COLORS, PUZZLE_REWARDS, SANITY_EFFECTS, createProgressBar } from '../../../constants/GAME_CONSTANTS';
import { join } from 'path';
import { promises as fs } from 'fs';

async function getTunnelAttachment(): Promise<AttachmentBuilder | null> {
    const tunnelGifPath = join(__dirname, '..', '..', '..', '..', 'gif', 'tunnel.gif');
    
    try {
      await fs.access(tunnelGifPath);
      return new AttachmentBuilder(tunnelGifPath, { name: 'tunnel.gif' });
    } catch (error) {
      console.error('Tunnel GIF not found:', error);
      console.error('Attempted path:', tunnelGifPath);
      return null;
    }
  }

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

interface TunnelSession {
    sequence: string[];
    remainingAttempts: number;
    maxAttempts: number;
    lastActionTime?: number;
}

const activeSessions = new Map<string, TunnelSession>();
const COOLDOWN_MS = 2000; 

function validateActionTiming(session: TunnelSession): boolean {
    const now = Date.now();
    if (session.lastActionTime && now - session.lastActionTime < COOLDOWN_MS) {
        return false;
    }
    session.lastActionTime = now;
    return true;
}

function generateSequence(difficulty: 'easy' | 'medium' | 'hard'): string[] {
    const lengths = { easy: 4, medium: 6, hard: 8 };
    const length = lengths[difficulty];
    const sequence: string[] = [];
    let lastDirection = '';
    
    for (let i = 0; i < length; i++) {
        let direction;
        do {
            direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
            if (difficulty !== 'easy') {
                const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
                if (opposites[direction as keyof typeof opposites] === lastDirection) {
                    direction = '';
                }
            }
        } while (!direction);
        
        sequence.push(direction);
        lastDirection = direction;
    }
    
    return sequence;
}

function formatSequence(sequence: string[], sanity: number): string {
    let formatted = sequence.map(dir => DIRECTION_EMOJIS[dir as keyof typeof DIRECTION_EMOJIS]).join(' ');
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

const TUNNEL_DIFFICULTY = {
  easy: {
    sequenceLength: 4,
    viewTime: 7000,
    maxAttempts: 2,
    rewards: {
      success: { meritPoints: 10, sanity: 3 },
      failure: { meritPoints: -15, sanity: -10, suspicion: 12 }
    }
  },
  medium: {
    sequenceLength: 6,
    viewTime: 5000,
    maxAttempts: 1,
    rewards: {
      success: { meritPoints: 20, sanity: 5 },
      failure: { meritPoints: -25, sanity: -15, suspicion: 18 }
    }
  },
  hard: {
    sequenceLength: 8,
    viewTime: 6000,
    maxAttempts: 1,
    rewards: {
      success: { meritPoints: 35, sanity: 8 },
      failure: { meritPoints: -40, sanity: -20, suspicion: 25 }
    }
  }
};

function applySequenceDistortion(sequence: string[], sanity: number): string[] {
  if (sanity > 70) return sequence;

  return sequence.map(direction => {
    if (sanity < 30 && Math.random() < 0.2) {
      const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
      return opposites[direction as keyof typeof opposites];
    }

    // Distort text at medium-low sanity
    if (sanity < 50) {
      return SANITY_EFFECTS.hallucinations.distortCards(direction, sanity);
    }

    return direction;
  });
}

function addVisualNoise(text: string, intensity: number): string {
  const noiseChars = ['̷', '̶', '̸', '̵', '̴', '░', '▒', '▓', '█'];
  let result = text;
  
  for (let i = 0; i < intensity; i++) {
    const pos = Math.floor(Math.random() * result.length);
    const noise = noiseChars[Math.floor(Math.random() * noiseChars.length)];
    result = result.slice(0, pos) + noise + result.slice(pos);
  }
  
  return result;
}

function applyVisualCorruption(text: string, sanity: number): string {
    if (sanity > 70) return text;
    
    const intensity = (100 - sanity) / 100;
    const corruptionChars = ['̷', '̶', '̸', '̵', '̴', '░', '▒', '▓', '█'];
    
    return text.split('').map(char => {
        if (Math.random() < intensity * 0.4) {
            return char + corruptionChars[Math.floor(Math.random() * corruptionChars.length)];
        }
        if (Math.random() < intensity * 0.2) {
            return corruptionChars[Math.floor(Math.random() * corruptionChars.length)];
        }
        return char;
    }).join('');
}

async function handleInteractionError(error: any, interaction: any, phase: string): Promise<void> {
    console.error(`Error in tunnel command (${phase}):`, error);
    try {
        const errorEmbed = new EmbedBuilder()
            .setColor(PRISON_COLORS.danger)
            .setTitle('🚫 System Error')
            .setDescription('An error occurred while processing your request.')
            .setFooter({ text: 'Try the action again or start a new game.' });

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        } else {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }
    } catch (followUpError) {
        console.error('Error sending error message:', followUpError);
    }
}

export default new SlashCommand({
    registerType: RegisterType.Global,
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
        try {
            let gameOver = false;

            await interaction.deferReply();

            const user = await User.findOne({ discordId: interaction.user.id });
            if (!user) {
                await interaction.editReply('You need to register first! Use `/register` to begin your journey.');
                return;
            }
            const suspicous = user.suspiciousLevel > 50;
            const merit = user.meritPoints;
            if(merit < 100) {
                await interaction.editReply('You dont have enough merit points to play this. You can play the previous game to earn more points');
                return;
            }
            if(suspicous) {
                await interaction.editReply('You are too suspicious to play this game. Try again later.');
                return;
            }
            user.survivalDays += 1;
            await user.save();

            if (user.isInIsolation || user.suspiciousLevel >= 80) {
                const embed = new EmbedBuilder()
                    .setColor(PRISON_COLORS.danger)
                    .setTitle('⚠️ Access Denied')
                    .setDescription(user.isInIsolation 
                        ? applyVisualCorruption('You are in isolation. Access restricted.', user.sanity)
                        : applyVisualCorruption('Your suspicious behavior has been noted.', user.sanity))
                    .setFooter({ text: 'Return when your status improves.' });
                
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const difficulty = interaction.options.getString('difficulty', true) as 'easy' | 'medium' | 'hard';
            const difficultySettings = TUNNEL_DIFFICULTY[difficulty];
            const sequence = generateSequence(difficulty);
            const game: TunnelGame = {
                sequence,
                difficulty,
                attempts: 0,
                maxAttempts: difficultySettings.maxAttempts
            };

            const existingSession = activeSessions.get(interaction.user.id);
            if (existingSession) {
                const now = Date.now();
                if (existingSession.lastActionTime && now - existingSession.lastActionTime < 30000) {
                    await interaction.editReply({
                        content: 'Please wait before starting another tunnel sequence.'
                    });
                    return;
                }
            }

            const session: TunnelSession = {
                sequence,
                remainingAttempts: difficultySettings.maxAttempts,
                maxAttempts: difficultySettings.maxAttempts,
                lastActionTime: Date.now()
            };

            activeSessions.set(interaction.user.id, session);

            const tunnelGifAttachment = await getTunnelAttachment();

            const storylineData = STORYLINE.tunnel1;
            const initialEmbed = new EmbedBuilder()
                .setColor(user.sanity < 30 ? PRISON_COLORS.danger : PRISON_COLORS.primary)
                .setTitle('🌀 The Digital Tunnel')
                .setDescription(
                    `${user.sanity < 50 ? applyVisualCorruption(storylineData.flavorText, user.sanity) : storylineData.flavorText}\n\n` +
                    (user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : '') +
                    '**Memorize the sequence:**\n' +
                    formatSequence(applySequenceDistortion(sequence, user.sanity), user.sanity)
                )
                .addFields(
                    { name: '🎯 Difficulty', value: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`, inline: true },
                    { name: '💫 Attempts', value: `${difficultySettings.maxAttempts}`, inline: true },
                    { name: '🧠 Sanity', value: `${createProgressBar(user.sanity, 100)} ${user.sanity}%`, inline: true }
                )
                .setFooter({ 
                    text: user.sanity < 50 
                        ? applyVisualCorruption('The walls shift...', user.sanity)
                        : 'Remember the pattern...' 
                });
            if (tunnelGifAttachment) {
                initialEmbed.setImage('attachment://tunnel.gif');
            }
            
            const message = await interaction.editReply({ 
                embeds: [initialEmbed],
                ...(tunnelGifAttachment ? { files: [tunnelGifAttachment] } : {})
            });

            let viewTime = difficultySettings.viewTime;
            if (user.sanity < 50) {
                viewTime *= 0.8;
            }
            if (user.sanity < 30) {
                viewTime *= 0.6;
            }

            let hallucinationInterval: NodeJS.Timeout | null = null;
            if (user.sanity < 40) {
                hallucinationInterval = setInterval(async () => {
                    if (!gameOver) {
                        try {
                            await interaction.followUp({
                                content: applyVisualCorruption(
                                    SANITY_EFFECTS.hallucinations.messages[
                                        Math.floor(Math.random() * SANITY_EFFECTS.hallucinations.messages.length)
                                    ],
                                    user.sanity
                                ),
                                ephemeral: true
                            });
                        } catch (error) {
                            console.error("Hallucination error:", error);
                        }
                    }
                }, 3000);
            }

            setTimeout(async () => {
                try {
                    if (hallucinationInterval) {
                        clearInterval(hallucinationInterval);
                    }
                    
                    const promptEmbed = new EmbedBuilder()
                        .setColor(PRISON_COLORS.primary)
                        .setTitle('🌀 Enter the Sequence')
                        .setDescription(
                            user.sanity < 40 ?
                            'T̷h̶e̷ ̵p̷a̴t̵h̷ ̵t̶w̷i̸s̷t̴s̷ ̵i̸n̵ ̷y̵o̷u̶r̵ ̴m̶i̶n̸d̸.̶.̵.' :
                            'The sequence vanishes... What path did you see?'
                        );

                    const buttonRow = new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('show_sequence_modal')
                                .setLabel('Enter Sequence')
                                .setStyle(ButtonStyle.Primary)
                        );

                    await interaction.editReply({
                        embeds: [promptEmbed],
                        components: [buttonRow],
                        files: [] 
                    });

                    // Create collector for the button
                    const collector = message.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        time: 120000, 
                        filter: i => i.user.id === interaction.user.id
                    });

                    collector.on('collect', async (i) => {
                        if (i.customId === 'show_sequence_modal') {
                            try {
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
                                
                                const modalFilter = (submission: ModalSubmitInteraction) => 
                                    submission.customId === 'sequence_input' && 
                                    submission.user.id === interaction.user.id;
                                
                                try {
                                    const submission = await interaction.awaitModalSubmit({ 
                                        filter: modalFilter, 
                                        time: 120000 
                                    });
                                    
                                    await submission.deferReply({ ephemeral: false });
                                    
                                    const answer = submission.fields.getTextInputValue('sequence_answer')
                                        .trim().toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ');
                                    
                                    const userMoves = answer.split(' ');
                                    const validDirections = ['up', 'down', 'left', 'right'];
                                    const isValidInput = userMoves.every(move => validDirections.includes(move));
                                    const correctLength = game.sequence.length;

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
                                        
                                        if (game.attempts < game.maxAttempts - 1) {
                                            game.attempts++;
                                            
                                            const retryRow = new ActionRowBuilder<ButtonBuilder>()
                                                .addComponents(
                                                    new ButtonBuilder()
                                                        .setCustomId('retry_tunnel')
                                                        .setLabel('Retry')
                                                        .setStyle(ButtonStyle.Primary)
                                                );
                                            
                                            await interaction.editReply({ components: [retryRow] });
                                        } else {
                                            await interaction.editReply({ components: [] });
                                            collector.stop();
                                            gameOver = true;
                                        }
                                        return;
                                    }

                                    let correctCount = 0;
                                    game.sequence.forEach((correctMove, index) => {
                                        if (userMoves[index] === correctMove) correctCount++;
                                    });
                                    
                                    const matchRatio = correctCount / sequence.length;
                                    const scorePercentage = Math.round(matchRatio * 100);
                                    
                                    const rewards = PUZZLE_REWARDS[game.difficulty];
                                    const isSuccess = scorePercentage >= 70;
                                    
                                    gameOver = true;
                                    
                                    if (!isSuccess) {
                                        const penaltyPoints = rewards.failure.meritPoints * 1.5; 
                                        const sanityCost = rewards.failure.sanity * 1.2;
                                        const suspicionIncrease = 8; 

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

                                        await submission.editReply({ embeds: [resultEmbed] });
                                        await interaction.editReply({ components: [] });
                                        collector.stop();
                                        return;
                                    } else {
                                        // Success case - Update user stats for success
                                        const meritChange = rewards.success.meritPoints;
                                        const sanityChange = rewards.success.sanity;
                                        
                                        await UserService.updateUserStats(interaction.user.id, {
                                            meritPoints: user.meritPoints + meritChange,
                                            sanity: Math.min(Math.max(user.sanity + sanityChange, 0), 100),
                                            suspiciousLevel: user.suspiciousLevel,
                                            totalGamesPlayed: user.totalGamesPlayed + 1,
                                            totalGamesWon: user.totalGamesWon + 1,
                                            currentStreak: user.currentStreak + 1
                                        });
                                        
                                        await UserService.updatePuzzleProgress(interaction.user.id, 'tunnel1', true);
                                        
                                        // Create result embed for success
                                        const resultEmbed = new EmbedBuilder()
                                            .setColor(PRISON_COLORS.success)
                                            .setTitle('🌟 Tunnel Navigated!')
                                            .setDescription(
                                                'You found your way through the digital labyrinth!\n\n' +
                                                `Correct Sequence: ${formatSequence(game.sequence, 100)}\n` +
                                                `Your Sequence: ${formatSequence(userMoves.slice(0, game.sequence.length), user.sanity)}\n` +
                                                `Accuracy: ${scorePercentage}%`
                                            )
                                            .addFields({
                                                name: '📊 Results',
                                                value: 
                                                    `Merit Points: +${meritChange}\n` +
                                                    `Sanity: +${sanityChange}\n` +
                                                    `Streak: ${user.currentStreak + 1}`
                                            })
                                            .setFooter({ 
                                                text: user.sanity < 30 
                                                    ? 'T̷h̷e̶ ̷p̶a̵t̷h̴ ̷b̶e̷c̵o̷m̵e̷s̶ ̷c̵l̷e̴a̷r̶e̷r̵.̷.̶.' 
                                                    : 'The path becomes clearer...'
                                            });
                                        
                                        await submission.editReply({ embeds: [resultEmbed] });
                                        await interaction.editReply({ components: [] });
                                        collector.stop();
                                    }
                                    
                                } catch (modalError) {
                                    console.error("Modal error:", modalError);
                                    await i.followUp({ 
                                        content: "Error processing your sequence. Please try again.", 
                                        ephemeral: true 
                                    });
                                }
                            } catch (error) {
                                console.error("Modal show error:", error);
                            }
                        } else if (i.customId === 'retry_tunnel') {
                            // Handle retry
                            game.attempts++;
                            
                            // Create a new attachment for the retry
                            const retryTunnelGifAttachment = await getTunnelAttachment();
                            
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
                                
                            if (retryTunnelGifAttachment) {
                                retryEmbed.setImage('attachment://tunnel.gif');
                            }
                            
                            await i.update({ 
                                embeds: [retryEmbed], 
                                components: [],
                                ...(retryTunnelGifAttachment ? { files: [retryTunnelGifAttachment] } : {})
                            });
                            
                            // Wait for view time
                            setTimeout(async () => {
                                try {
                                    // Show button to enter sequence again
                                    await interaction.editReply({
                                        embeds: [promptEmbed],
                                        components: [buttonRow],
                                        files: []  // Remove the GIF after viewing time
                                    });
                                } catch (error) {
                                    console.error("Retry flow error:", error);
                                }
                            }, viewTime);
                        }
                    });

                    collector.on('end', async () => {
                        // Clean up on collector end
                        if (!gameOver) {
                            try {
                                await interaction.editReply({
                                    components: [],
                                    content: "Time's up! The tunnel has closed."
                                });
                            } catch (error) {
                                console.error("Collector end error:", error);
                            }
                        }
                    });
                } catch (error) {
                    await handleInteractionError(error, interaction, "sequence_display");
                }
            }, viewTime);

        } catch (error) {
            await handleInteractionError(error, interaction, 'game_execution');
        }
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
