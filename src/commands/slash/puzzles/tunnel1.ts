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
    ComponentType
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
                ))as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) {
            await interaction.editReply('You need to register first! Use `/register` to begin your journey.');
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
        await interaction.editReply({ embeds: [initialEmbed] });

        // Wait 5 seconds (or less if sanity is low)
        const viewTime = Math.max(2000, Math.min(5000, user.sanity * 50));
        await new Promise(resolve => setTimeout(resolve, viewTime));

        // Create input modal
        const modal = new ModalBuilder()
            .setCustomId('sequence_input')
            .setTitle('Enter the Sequence')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('sequence_input')
                        .setLabel('Type the directions (up/down/left/right)')
                        .setPlaceholder('Example: up right down left')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );

        // Show modal for user input
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(PRISON_COLORS.primary)
                .setTitle('🌀 Enter the Sequence')
                .setDescription(
                    user.sanity < 40 ?
                    'T̷h̶e̷ ̵p̷a̴t̵h̷ ̵t̶w̷i̸s̷t̴s̷ ̵i̸n̵ ̷y̵o̷u̶r̵ ̴m̶i̶n̶d̸.̶.̵.' :
                    'The sequence vanishes... What path did you see?'
                )
            ],
            components: []
        });

        try {
            await handleModalSubmission(interaction, sequence, user, game);
        } catch (error) {
            console.error('Error in tunnel game:', error);
            await interaction.followUp({ 
                content: 'An error occurred while processing your sequence. Please try again.',
                ephemeral: true 
            });
        }
    }
});

async function handleModalSubmission(
  interaction: ChatInputCommandInteraction, 
  sequence: string[], 
  user: UserDocument,
  game: TunnelGame
): Promise<void> {
  const modal = new ModalBuilder()
      .setCustomId('sequence_input')
      .setTitle('Enter the Sequence')
      .addComponents(
          new ActionRowBuilder<TextInputBuilder>()
              .addComponents(
                  new TextInputBuilder()
                      .setCustomId('sequence_answer')
                      .setLabel('Enter the sequence of directions')
                      .setPlaceholder('Example: up right down left')
                      .setStyle(TextInputStyle.Short)
                      .setRequired(true)
                      .setMinLength(2)
                      .setMaxLength(50)
              )
      );

  const submission = await interaction.showModal(modal).then(() =>
      interaction.awaitModalSubmit({
          time: 60000,
          filter: i => i.customId === 'sequence_input' && i.user.id === interaction.user.id
      })
  ).catch(() => null);

  if (!submission) {
      await interaction.followUp({ 
          content: 'You did not submit a sequence in time.',
          ephemeral: true 
      });
      return;
  }

  const answer = submission.fields.getTextInputValue('sequence_answer')
      .trim().toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ');

  // Rest of the validation and scoring logic...
  const userMoves = answer.split(' ');
  
  // Validate input format
  const validDirections = ['up', 'down', 'left', 'right'];
  const isValidInput = userMoves.every(move => validDirections.includes(move));

  if (!isValidInput) {
      await submission.reply({
          content: 'Invalid input! Please use only: up, down, left, right (separated by spaces)',
          ephemeral: true
      });
      return;
  }

  // Continue with the rest of your existing logic for scoring and rewards
  const correctMoves = sequence;
  let correctCount = 0;

  // Calculate accuracy
  for (let i = 0; i < correctMoves.length; i++) {
      if (userMoves[i] === correctMoves[i]) {
          correctCount++;
      }
  }
  const matchRatio = correctCount / sequence.length;
    const scorePercentage = Math.round(matchRatio * 100);
    
    // Calculate rewards based on performance and difficulty
    const rewards = PUZZLE_REWARDS[game.difficulty];
    const isSuccess = scorePercentage >= 70;
    
    const meritChange = isSuccess ? rewards.success.meritPoints : rewards.failure.meritPoints;
    const sanityChange = isSuccess ? rewards.success.sanity : rewards.failure.sanity;
    
    // Add suspicion for very poor performance
    const suspicionChange = scorePercentage < 30 ? Math.min(10, user.suspiciousLevel + 5) : 0;

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
            `Correct Sequence: ${formatSequence(correctMoves, 100)}\n` +
            `Your Sequence: ${formatSequence(userMoves, user.sanity)}\n` +
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

    // Add retry button if attempts remain
    const components: ActionRowBuilder<ButtonBuilder>[] = [];
    if (game.attempts < game.maxAttempts && !isSuccess) {
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('retry_tunnel')
                    .setLabel(`Retry (${game.maxAttempts - game.attempts} left)`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(user.sanity < 20)
            );
        components.push(row);
    }
  await submission.reply({
      embeds: [resultEmbed],
      components: components
  });
}

function getRandomGlitchMessage(): string {
    return SANITY_EFFECTS.glitchMessages[
        Math.floor(Math.random() * SANITY_EFFECTS.glitchMessages.length)
    ];
}