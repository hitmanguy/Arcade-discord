import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
  ComponentType,
  EmbedBuilder,
  AttachmentBuilder
} from 'discord.js';
import { RegisterType, SlashCommand } from '../../../handler';
import progressCommand from '../Progress/progress'; // adjust path if needed
import { join } from 'path';

const level1Puzzles = [
  // Riddles
  {
    type: 'riddle',
    question: "What has hands but cannot clap?",
    options: ['Clock', 'Monkey', 'Glove', 'Chair'],
    answer: 'Clock',
    flavor: '🕰️ *The steady ticking echoes through your cell...*',
    reward: 12,
    sanityImpact: { success: 5, failure: -3 }
  },
  {
    id: 'riddle_footsteps',
    type: 'riddle',
    question: "The more of me you take, the more you leave behind. What am I?",
    options: ['Time', 'Shadow', 'Footsteps', 'Silence'],
    answer: 'Footsteps',
    flavor: '👣 *Your steps echo in the empty corridor...*',
    reward: 15,
    sanityImpact: { success: 5, failure: -3 }
  },
  {
    id: 'riddle_teapot',
    type: 'riddle',
    question: 'What begins with T, ends with T, and has T in it?',
    options: ['Teapot', 'Tablet', 'Tent', 'Toilet'],
    answer: 'Teapot',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 }
  },
  {
    id: 'riddle_breath',
    type: 'riddle',
    question: "I'm light as a feather, yet the strongest man can't hold me for more than 5 minutes. What am I?",
    options: ['Breath', 'Cloud', 'Shadow', 'Hope'],
    answer: 'Breath',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 }
  },
  {
    id: 'riddle_echo',
    type: 'riddle',
    question: 'I speak without a mouth and hear without ears. I have nobody, but I come alive with the wind. What am I?',
    options: ['Echo', 'Wind', 'Whistle', 'Voice'],
    answer: 'Echo',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 }
  },
  {
    id: 'trivia_paris',
    type: 'trivia',
    question: 'What is the capital of France?',
    options: ['Paris', 'Berlin', 'London', 'Madrid'],
    answer: 'Paris',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 }
  },
  {
    id: 'trivia_mars',
    type: 'trivia',
    question: 'Which planet is known as the Red Planet?',
    options: ['Mars', 'Venus', 'Jupiter', 'Saturn'],
    answer: 'Mars',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 }
  },
  {
    id: 'trivia_lion',
    type: 'trivia',
    question: 'Which animal is known as the King of the Jungle?',
    options: ['Lion', 'Tiger', 'Elephant', 'Bear'],
    answer: 'Lion',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 }
  },
  {
    id: 'trivia_spider',
    type: 'trivia',
    question: 'How many legs does a spider have?',
    options: ['6', '8', '10', '12'],
    answer: '8',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 }
  },
  {
    id: 'trivia_pink',
    type: 'trivia',
    question: 'What color do you get when you mix red and white?',
    options: ['Pink', 'Purple', 'Orange', 'Peach'],
    answer: 'Pink',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 }
  },
  {
    id: 'math_19',
    type: 'math',
    question: 'What is 9 + 10?',
    options: ['19', '21', '18', '20'],
    answer: '19',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 }
  },
  {
    id: 'math_32',
    type: 'math',
    question: 'What is the next number in the pattern: 2, 4, 8, 16, ?',
    options: ['20', '30', '32', '24'],
    answer: '32',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 }
  },
  {
    id: 'math_50',
    type: 'math',
    question: "What's half of 100?",
    options: ['50', '40', '25', '60'],
    answer: '50',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 }
  },
  {
    id: 'math_12',
    type: 'math',
    question: 'A dozen equals how many?',
    options: ['10', '11', '12', '13'],
    answer: '12',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 }
  },
  {
    id: 'math_5pm',
    type: 'math',
    question: 'If a train leaves at 3:00 PM and takes 2 hours to reach its destination, what time will it arrive?',
    options: ['4:00 PM', '5:00 PM', '3:30 PM', '6:00 PM'],
    answer: '5:00 PM',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 }
  },
];

// Track user progress temporarily (replace with database logic in production)
const userProgressMap = new Map<string, {
  index: number,
  puzzles: typeof level1Puzzles,
  merit: number,
  hint: number,
  sanity: number,
  suspicion: number,
}>();

function getRandomPuzzles(n: number) {
  const shuffled = [...level1Puzzles].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('puzzle')
    .setDescription('Solve a sequence of level 1 puzzles!'),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const puzzles = getRandomPuzzles(5);
    await interaction.deferReply({flags: [MessageFlags.Ephemeral]});

    userProgressMap.set(userId, {
      index: 0,
      puzzles,
      merit: 0,
      hint: 0,
      sanity: 0,
      suspicion: 0,
    });

    await sendPuzzle(interaction, userId);
  },
});

async function sendPuzzle(interaction: ChatInputCommandInteraction, userId: string) {
  const session = userProgressMap.get(userId);
  if (!session) return;

  const current = session.puzzles[session.index];
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    current.options.map(opt =>
      new ButtonBuilder()
        .setCustomId(`puzzle:answer:${opt}`)
        .setLabel(opt)
        .setStyle(ButtonStyle.Primary)
    )
  );

  // Create the attachment for the puzzle GIF from local file
  const puzzleGifPath = join(__dirname, '../../../Gifs/puzzle.gif');
  const puzzleGifAttachment = new AttachmentBuilder(puzzleGifPath, { name: 'puzzle.gif' });

  // Create embed with puzzle information and GIF
  const puzzleEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`🧠 ${current.type.toUpperCase()} PUZZLE`)
    .setDescription(current.question)
    .setImage('attachment://puzzle.gif') // Reference the attachment
    .setFooter({ text: `Puzzle ${session.index + 1}/5` });

  // Add flavor text if available
  if (current.flavor) {
    puzzleEmbed.addFields({ name: '\u200B', value: current.flavor });
  }

  await interaction.editReply({
    embeds: [puzzleEmbed],
    files: [puzzleGifAttachment], // Include the GIF file
    components: [row],
  });

  const collector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 15000,
    max: 1,
  });

  collector?.on('collect', async (btnInteraction: any) => {
    if (btnInteraction.user.id !== interaction.user.id) {
      return btnInteraction.reply({ content: 'This is not your puzzle!', ephemeral: true });
    }

    const chosen = btnInteraction.customId.split(':')[2];
    const isCorrect = chosen === current.answer;

    // Update user stats based on answer
    if (isCorrect) {
      session.merit += current.reward;
      session.hint += 1;
      if (current.sanityImpact?.success) {
        session.sanity += current.sanityImpact.success;
      }
    } else {
      if (current.sanityImpact?.failure) {
        session.sanity += current.sanityImpact.failure;
      }
      session.suspicion += 5;
    }

    // Create result embed
    const resultEmbed = new EmbedBuilder()
      .setColor(isCorrect ? '#00ff00' : '#ff0000')
      .setTitle(isCorrect ? '✅ CORRECT!' : '❌ INCORRECT!')
      .setDescription(isCorrect 
        ? `**${current.answer}** was the right answer.\n\n🎉 +${current.reward} Merit | 🧠 +1 Hint${current.sanityImpact?.success ? ` | 😌 +${current.sanityImpact.success} Sanity` : ''}`
        : `The correct answer was **${current.answer}**.\n\n${current.sanityImpact?.failure ? `🔻 ${current.sanityImpact.failure} Sanity | ` : ''}⚠️ +5 Suspicion`);

    await btnInteraction.update({
      embeds: [resultEmbed],
      files: [],
      components: [],
    });

    session.index += 1;

    // Wait a moment, then show next or final screen
    setTimeout(async () => {
      if (session.index < 5) {
        await sendPuzzle(interaction, userId);
      } else {
        await showFinalOptions(interaction, userId);
      }
    }, 2000);
  });
}

async function showFinalOptions(interaction: ChatInputCommandInteraction, userId: string) {
  const session = userProgressMap.get(userId);
  if (!session) return;

  // Create the attachment for the puzzle GIF from local file
  const puzzleGifPath = join(__dirname, '../../../Gifs/puzzle.gif');
  const puzzleGifAttachment = new AttachmentBuilder(puzzleGifPath, { name: 'puzzle.gif' });

  const embed = new EmbedBuilder()
    .setTitle('🧩 Puzzle Report')
    .setDescription(`You've completed Level 1 puzzles!`)
    .setImage('attachment://puzzle.gif') // Reference the attachment
    .addFields(
      { name: '💰 Merit Points', value: session.merit.toString(), inline: true },
      { name: '💡 Hints Earned', value: session.hint.toString(), inline: true },
      { name: '🧠 Sanity', value: session.sanity.toString(), inline: true },
      { name: '👁️ Suspicion', value: session.suspicion.toString(), inline: true }
    )
    .setColor('Blue')
    .setFooter({ text: 'Return tomorrow for more puzzles!' });

  // Create action buttons
  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('puzzle:progress')
      .setLabel('📊 View Progress')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('puzzle:profile')
      .setLabel('👤 View Profile')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.editReply({
    embeds: [embed],
    files: [puzzleGifAttachment], // Include the GIF file
    components: [buttonRow]
  });

  // Set up collector for the buttons
  const collector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith('puzzle:'),
    time: 60000 // 1 minute
  });

  collector?.on('collect', async (btnInteraction: any) => {
    const action = btnInteraction.customId.split(':')[1];
    
    switch (action) {
      case 'progress':
        await btnInteraction.reply({ content: 'Use the `/progress` command to see your full progress!', ephemeral: true });
        break;
      case 'profile':
        await btnInteraction.reply({ content: 'Use the `/profile view` command to see your full profile!', ephemeral: true });
        break;
    }
  });

  collector?.on('end', async () => {
    try {
      await interaction.editReply({
        components: [] // Remove all components when collector ends
      });
    } catch (error) {
      console.error('Failed to remove components:', error);
    }
  });
}