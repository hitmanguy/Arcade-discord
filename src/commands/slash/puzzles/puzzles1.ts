import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
  ComponentType,
  EmbedBuilder,
} from 'discord.js';
import { RegisterType, SlashCommand } from '../../../handler';
import progressCommand from '../Progress/progress'; // adjust path if needed


const level1Puzzles = [
  // Ri
  {
    type: 'riddle',
    question: "What has hands but cannot clap?",
    options: ['Clock', 'Monkey', 'Glove', 'Chair'],
    answer: 'Clock',
    flavor: '🕰️ *The steady ticking echoes through your cell...*',
    reward: 12,
    sanityImpact: { success: 5, failure: -3 },
    image: 'https://i.imgur.com/8tJt6x2.png'
  },
  {
    id: 'riddle_footsteps',
    type: 'riddle',
    question: "The more of me you take, the more you leave behind. What am I?",
    options: ['Time', 'Shadow', 'Footsteps', 'Silence'],
    answer: 'Footsteps',
    flavor: '👣 *Your steps echo in the empty corridor...*',
    reward: 15,
    sanityImpact: { success: 5, failure: -3 },
    image: 'https://i.imgur.com/TZz7Gdb.png'
  },
  {
    id: 'riddle_teapot',
    type: 'riddle',
    question: 'What begins with T, ends with T, and has T in it?',
    options: ['Teapot', 'Tablet', 'Tent', 'Toilet'],
    answer: 'Teapot',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 },
    image: 'https://i.imgur.com/8tJt6x2.png'
  },
  {
    id: 'riddle_breath',
    type: 'riddle',
    question: 'I’m light as a feather, yet the strongest man can’t hold me for more than 5 minutes. What am I?',
    options: ['Breath', 'Cloud', 'Shadow', 'Hope'],
    answer: 'Breath',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 },
    image: 'https://i.imgur.com/8tJt6x2.png'
  },
  {
    id: 'riddle_echo',
    type: 'riddle',
    question: 'I speak without a mouth and hear without ears. I have nobody, but I come alive with the wind. What am I?',
    options: ['Echo', 'Wind', 'Whistle', 'Voice'],
    answer: 'Echo',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 },
    image: 'https://i.imgur.com/8tJt6x2.png'
  },
  {
    id: 'trivia_paris',
    type: 'trivia',
    question: 'What is the capital of France?',
    options: ['Paris', 'Berlin', 'London', 'Madrid'],
    answer: 'Paris',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 },
    image: 'https://i.imgur.com/8tJt6x2.png'
  },
  {
    id: 'trivia_mars',
    type: 'trivia',
    question: 'Which planet is known as the Red Planet?',
    options: ['Mars', 'Venus', 'Jupiter', 'Saturn'],
    answer: 'Mars',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 },
    image: 'https://i.imgur.com/8tJt6x2.png'
  },
  {
    id: 'trivia_lion',
    type: 'trivia',
    question: 'Which animal is known as the King of the Jungle?',
    options: ['Lion', 'Tiger', 'Elephant', 'Bear'],
    answer: 'Lion',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 },
    image: 'https://i.imgur.com/8tJt6x2.png'
  },
  {
    id: 'trivia_spider',
    type: 'trivia',
    question: 'How many legs does a spider have?',
    options: ['6', '8', '10', '12'],
    answer: '8',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 },
    image: 'https://i.imgur.com/8tJt6x2.png'
  },
  {
    id: 'trivia_pink',
    type: 'trivia',
    question: 'What color do you get when you mix red and white?',
    options: ['Pink', 'Purple', 'Orange', 'Peach'],
    answer: 'Pink',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 },
    image: 'https://i.imgur.com/8tJt6x2.png'
  },
  {
    id: 'math_19',
    type: 'math',
    question: 'What is 9 + 10?',
    options: ['19', '21', '18', '20'],
    answer: '19',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 },
    image: 'https://i.imgur.com/8tJt6x2.png'
  },
  {
    id: 'math_32',
    type: 'math',
    question: 'What is the next number in the pattern: 2, 4, 8, 16, ?',
    options: ['20', '30', '32', '24'],
    answer: '32',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 },
    image: 'https://i.imgur.com/8tJt6x2.png'
  },
  {
    id: 'math_50',
    type: 'math',
    question: 'What’s half of 100?',
    options: ['50', '40', '25', '60'],
    answer: '50',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 },
    image: 'https://i.imgur.com/8tJt6x2.png'
  },
  {
    id: 'math_12',
    type: 'math',
    question: 'A dozen equals how many?',
    options: ['10', '11', '12', '13'],
    answer: '12',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 },
    image: 'https://i.imgur.com/8tJt6x2.png'
  },
  {
    id: 'math_5pm',
    type: 'math',
    question: 'If a train leaves at 3:00 PM and takes 2 hours to reach its destination, what time will it arrive?',
    options: ['4:00 PM', '5:00 PM', '3:30 PM', '6:00 PM'],
    answer: '5:00 PM',
    reward: 10,
    sanityImpact: { success: 4, failure: -2 },
    image: 'https://i.imgur.com/8tJt6x2.png'
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

  await interaction.reply({
    content: `🧠 **${current.type.toUpperCase()}**
${current.question}`,
    components: [row],
    flags: [MessageFlags.Ephemeral],
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

    if (isCorrect) {
      session.merit += 10;
      session.hint += 1;
    } else {
      session.sanity -= 5;
      session.suspicion += 5;
    }

    await btnInteraction.update({
      content: isCorrect
        ? `✅ Correct! **${current.answer}** was the right answer.
🎉 +10 Merit | 🧠 +1 Hint`
        : `❌ Wrong! The correct answer was **${current.answer}**.
🔻 -5 Sanity | ⚠️ +5 Suspicion`,
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

  const embed = new EmbedBuilder()
    .setTitle('🧩 Puzzle Report')
    .setDescription(`You've completed Level 1 puzzles!`)
    .addFields(
      { name: 'Merit Points', value: session.merit.toString(), inline: true },
      { name: 'Hints Earned', value: session.hint.toString(), inline: true },
      { name: 'Sanity Lost', value: session.sanity.toString(), inline: true },
      { name: 'Suspicion Gained', value: session.suspicion.toString(), inline: true }
    )
    .setColor('Blue');

  const continueRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('puzzle:continue:tunnel')
      .setLabel('🚇 Enter Tunnel')
      .setStyle(session.merit >= 50 ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(session.merit < 50),

    new ButtonBuilder()
      .setCustomId('puzzle:continue:retry')
      .setLabel('🔁 Play Again')
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.followUp({
    embeds: [embed],
    components: [continueRow],
    ephemeral: true,
  });

  const collector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 15000,
    max: 1,
  });

  collector?.on('collect', async (btnInteraction: any) => {
    if (btnInteraction.user.id !== interaction.user.id) {
      return btnInteraction.reply({ content: 'This is your puzzle journey!', ephemeral: true });
    }

    if (btnInteraction.customId === 'puzzle:continue:retry') {
      userProgressMap.delete(userId);
      const newPuzzles = getRandomPuzzles(5);
    
      userProgressMap.set(userId, {
        index: 0,
        puzzles: newPuzzles,
        merit: 0,
        hint: 0,
        sanity: 0,
        suspicion: 0,
      });
    
      return await sendPuzzle(btnInteraction, userId);
    }
    
    if (btnInteraction.customId === 'puzzle:continue:tunnel') {
      return await btnInteraction.reply({
        content: '🚇 Entering **The Tunnel**...\n> _[Tunnel command to be triggered here]_',
        ephemeral: true,
      });
    }
  });

  // Optionally trigger progress slash command
  await progressCommand.execute(interaction);
}
