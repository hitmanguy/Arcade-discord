import { RegisterType, SlashCommand } from '../../../handler';
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  ModalBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  Message,
  MessageFlags
} from 'discord.js';

// Enhanced direction set with better visuals
const DIRECTIONS = [
  { emoji: '⬅️', name: 'Left', action: 'Dodge left!', color: '#3498db' },
  { emoji: '➡️', name: 'Right', action: 'Swerve right!', color: '#e74c3c' },
  { emoji: '⬆️', name: 'Forward', action: 'Dash forward!', color: '#2ecc71' },
  { emoji: '⬇️', name: 'Backward', action: 'Step back!', color: '#f39c12' }
];

// Intense situations to make the race feel more dynamic
const TUNNEL_HAZARDS = [
  "Falling debris!",
  "Spike trap!",
  "Laser grid!",
  "Water surge!",
  "Flame jets!",
  "Collapsing floor!",
  "Electric barrier!",
  "Swinging blade!"
];

function generateRaceSequence(difficulty: number = 1): any[] {
  const baseLength = 3;
  const length = baseLength + difficulty;
  const sequence = [];
  
  for (let i = 0; i < length; i++) {
    const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const hazard = TUNNEL_HAZARDS[Math.floor(Math.random() * TUNNEL_HAZARDS.length)];
    sequence.push({
      direction: direction,
      hazard: hazard
    });
  }
  
  return sequence;
}

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('tunnel')
    .setDescription('Test your reflexes in the deadly tunnel race!')
    .addIntegerOption(option =>
      option
        .setName('difficulty')
        .setDescription('Choose speed level (1-5)')
        .setMinValue(1)
        .setMaxValue(5)
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const difficulty = interaction.options.getInteger('difficulty') || 1;
    const sequence = generateRaceSequence(difficulty);
    const flashTime = Math.max(1500 - (difficulty * 200), 600); // Faster flashing at higher difficulties
    
    // Correct answer is just the directions in sequence
    const correctAnswer = sequence.map(s => s.direction.name.toLowerCase()).join(' ');

    const introEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('🏃‍♂️ TUNNEL RACE INITIATED 🏃‍♀️')
      .setDescription(`**Speed Level: ${difficulty}**\n\n⚠️ **DANGER AHEAD!** ⚠️\n\nQuickly react to the hazards as they appear! Your life depends on it!\n\n*Get ready in 3...*`);

    await interaction.reply({
      embeds: [introEmbed],
      ephemeral: true
    });

    // Countdown animation
    await new Promise(r => setTimeout(r, 1000));
    await interaction.editReply({
      embeds: [introEmbed.setDescription(`**Speed Level: ${difficulty}**\n\n⚠️ **DANGER AHEAD!** ⚠️\n\nQuickly react to the hazards as they appear! Your life depends on it!\n\n*Get ready in 2...*`)]
    });
    
    await new Promise(r => setTimeout(r, 1000));
    await interaction.editReply({
      embeds: [introEmbed.setDescription(`**Speed Level: ${difficulty}**\n\n⚠️ **DANGER AHEAD!** ⚠️\n\nQuickly react to the hazards as they appear! Your life depends on it!\n\n*Get ready in 1...*`)]
    });
    
    await new Promise(r => setTimeout(r, 1000));
    await interaction.editReply({
      embeds: [introEmbed.setDescription(`**Speed Level: ${difficulty}**\n\n⚠️ **DANGER AHEAD!** ⚠️\n\nQuickly react to the hazards as they appear! Your life depends on it!\n\n**GO!**`)]
    });

    // Flash each direction with dramatic hazard descriptions
    for (let i = 0; i < sequence.length; i++) {
      const { direction, hazard } = sequence[i];
      
      const stepEmbed = new EmbedBuilder()
        .setColor(direction.color)
        .setTitle(`${hazard} ${direction.emoji}`)
        .setDescription(`**${direction.action.toUpperCase()}**\n\n*${i+1} of ${sequence.length}*`)
        .setFooter({ text: `Memorize these moves to survive!` });

      await interaction.editReply({ embeds: [stepEmbed] });
      await new Promise(r => setTimeout(r, flashTime));
    }

    // Race finished, now prompt for response
    const responseEmbed = new EmbedBuilder()
      .setColor('#ffaa00')
      .setTitle('🏁 Race Complete!')
      .setDescription('Quick! What moves did you make to survive? Enter the sequence!');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('hint')
        .setLabel('🔍 Need a hint?')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('enter')
        .setLabel('📝 Enter moves')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({
      embeds: [responseEmbed],
      components: [row]
    });

    // Handle button interactions
    const btnCollector = await interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id && (i.customId === 'hint' || i.customId === 'enter'),
      time: 15000
    });

    if (!btnCollector) {
      await interaction.followUp({
        content: 'Error setting up the game. Please try again.',
        ephemeral: true
      });
      return;
    }

    btnCollector.on('collect', async (btnInteraction) => {
      btnCollector.stop();
      
      if (btnInteraction.customId === 'hint') {
        await btnInteraction.reply({
          content: `📌 **Hint:** First move was **${sequence[0].direction.name}** to avoid the ${sequence[0].hazard}!`,
          ephemeral: true
        });
        
        const hintRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('enter_after_hint')
            .setLabel('📝 Enter your moves')
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({
          components: [hintRow]
        });
        
        const secondCollector = await interaction.channel?.createMessageComponentCollector({
          componentType: ComponentType.Button,
          filter: (i) => i.user.id === interaction.user.id && i.customId === 'enter_after_hint',
          time: 15000
        });
        
        secondCollector?.on('collect', async (hintBtnInteraction) => {
          secondCollector.stop();
          await showModal(hintBtnInteraction, difficulty);
          await handleModalSubmission(hintBtnInteraction, correctAnswer, sequence, difficulty);
        });
      } else {
        await showModal(btnInteraction, difficulty);
        await handleModalSubmission(btnInteraction, correctAnswer, sequence, difficulty);
      }
    });

    btnCollector.on('end', async (collected) => {
      if (collected.size === 0) {
        const timeoutEmbed = new EmbedBuilder()
          .setColor('#ff5555')
          .setTitle('❌ Too Slow!')
          .setDescription('You failed to react in time. The tunnel collapses around you!');
          
        await interaction.editReply({
          embeds: [timeoutEmbed],
          components: []
        });
      }
    });
  }
});

async function showModal(btnInteraction: any, difficulty: number) {
  const modal = new ModalBuilder()
    .setCustomId('tunnel_modal')
    .setTitle(`Tunnel Race - Level ${difficulty}`);

  const input = new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId('sequence_input')
      .setLabel('Enter the direction sequence')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., left right forward backward')
      .setRequired(true)
  );

  modal.addComponents(input);
  await btnInteraction.showModal(modal);
}

async function handleModalSubmission(btnInteraction: any, correctAnswer: string, sequence: any[], difficulty: number) {
  const submission = await btnInteraction.awaitModalSubmit({
    filter: (i: any) => i.customId === 'tunnel_modal' && i.user.id === btnInteraction.user.id,
    time: 20000,
  }).catch(() => null);

  if (!submission) {
    await btnInteraction.followUp({
      content: '❌ You took too long to respond. The tunnel collapses!',
      ephemeral: true
    });
    return;
  }

  const answer = submission.fields.getTextInputValue('sequence_input')
    .trim().toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ');

  const userMoves = answer.split(' ');
  const correctMoves = correctAnswer.split(' ');
  let correctCount = 0;
  
  for (let i = 0; i < correctMoves.length; i++) {
    if (userMoves[i] === correctMoves[i]) {
      correctCount++;
    }
  }
  
  const matchRatio = correctCount / sequence.length;
  const scorePercentage = Math.round(matchRatio * 100);
  
  // Calculate rewards based on performance and difficulty
  const baseReward = 10;
  const bonusPoints = Math.round(baseReward * difficulty * matchRatio);
  
  if (matchRatio >= 0.8) {
    // Success - player did well
    const successEmbed = new EmbedBuilder()
      .setColor('#00ff99')
      .setTitle(matchRatio === 1 ? '🏆 PERFECT ESCAPE!' : '✅ Successful Escape!')
      .setDescription(`You navigated through ${scorePercentage}% of the tunnel hazards correctly!`)
      .addFields(
        { name: 'Performance', value: createPerformanceBar(scorePercentage), inline: false },
        { name: 'Rewards', value: `🎖️ +${bonusPoints} Merit Points\n🧠 +${Math.round(5 * difficulty * matchRatio)} Sanity Points`, inline: false }
      );
      
    if (matchRatio === 1) {
      successEmbed.setFooter({ text: '💯 Perfect Score! Speed Bonus Applied!' });
    }
      
    await submission.reply({
      embeds: [successEmbed],
      ephemeral: true
    });
  } else {
    // Failure - player made too many mistakes
    const injuryLevel = 5 - Math.floor(matchRatio * 5);
    const injuries = ['a few scratches', 'minor wounds', 'serious injuries', 'critical injuries', 'near-fatal wounds'][injuryLevel];
    
    const failureEmbed = new EmbedBuilder()
      .setColor('#ff5555')
      .setTitle('❌ Tunnel Collapse!')
      .setDescription(`You only made ${scorePercentage}% of the correct moves and suffered ${injuries}!`)
      .addFields(
        { name: 'Performance', value: createPerformanceBar(scorePercentage), inline: false },
        { name: 'Correct Sequence', value: sequence.map(s => s.direction.emoji + ' ' + s.direction.name).join(' → '), inline: false },
        { name: 'Penalties', value: '⚠️ +2 Suspicion Points\n🔻 -5 Sanity Points', inline: false }
      );
      
    await submission.reply({
      embeds: [failureEmbed],
      ephemeral: true
    });
  }
}

function createPerformanceBar(percentage: number): string {
  const blockCount = 10;
  const filledBlocks = Math.round((percentage / 100) * blockCount);
  const emptyBlocks = blockCount - filledBlocks;
  
  let colorCode = '#ff0000'; // Red for low performance
  if (percentage >= 80) colorCode = '#00ff00'; // Green for high performance
  else if (percentage >= 50) colorCode = '#ffff00'; // Yellow for medium performance
  
  return `${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)} ${percentage}%`;
}