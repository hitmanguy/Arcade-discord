import { RegisterType, SlashCommand } from '../../../handler';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
  ComponentType,
} from 'discord.js';

// Define Level 1 puzzles
const level1Puzzles = [
  // Rid
  {
    type: 'riddle',
    question: 'What has hands but can’t clap?',
    options: ['Clock', 'Monkey', 'Glove', 'Chair'],
    answer: 'Clock',
  },
  {
    type: 'riddle',
    question: 'The more of me you take, the more you leave behind. What am I?',
    options: ['Time', 'Shadow', 'Footsteps', 'Silence'],
    answer: 'Footsteps',
  },
  {
    type: 'riddle',
    question: 'What begins with T, ends with T, and has T in it?',
    options: ['Teapot', 'Tablet', 'Tent', 'Toilet'],
    answer: 'Teapot',
  },
  {
    type: 'riddle',
    question: 'I’m light as a feather, yet the strongest man can’t hold me for more than 5 minutes. What am I?',
    options: ['Breath', 'Cloud', 'Shadow', 'Hope'],
    answer: 'Breath',
  },
  {
    type: 'riddle',
    question: 'I speak without a mouth and hear without ears. I have nobody, but I come alive with the wind. What am I?',
    options: ['Echo', 'Wind', 'Whistle', 'Voice'],
    answer: 'Echo',
  },
  // Trivia
  {
    type: 'trivia',
    question: 'What is the capital of France?',
    options: ['Paris', 'Berlin', 'London', 'Madrid'],
    answer: 'Paris',
  },
  {
    type: 'trivia',
    question: 'Which planet is known as the Red Planet?',
    options: ['Mars', 'Venus', 'Jupiter', 'Saturn'],
    answer: 'Mars',
  },
  {
    type: 'trivia',
    question: 'Which animal is known as the King of the Jungle?',
    options: ['Lion', 'Tiger', 'Elephant', 'Bear'],
    answer: 'Lion',
  },
  {
    type: 'trivia',
    question: 'How many legs does a spider have?',
    options: ['6', '8', '10', '12'],
    answer: '8',
  },
  {
    type: 'trivia',
    question: 'What color do you get when you mix red and white?',
    options: ['Pink', 'Purple', 'Orange', 'Peach'],
    answer: 'Pink',
  },
  // Math
  {
    type: 'math',
    question: 'What is 9 + 10?',
    options: ['19', '21', '18', '20'],
    answer: '19',
  },
  {
    type: 'math',
    question: 'What is the next number in the pattern: 2, 4, 8, 16, ?',
    options: ['20', '30', '32', '24'],
    answer: '32',
  },
  {
    type: 'math',
    question: 'What’s half of 100?',
    options: ['50', '40', '25', '60'],
    answer: '50',
  },
  {
    type: 'math',
    question: 'A dozen equals how many?',
    options: ['10', '11', '12', '13'],
    answer: '12',
  },
  {
    type: 'math',
    question: 'If a train leaves at 3:00 PM and takes 2 hours to reach its destination, what time will it arrive?',
    options: ['4:00 PM', '5:00 PM', '3:30 PM', '6:00 PM'],
    answer: '5:00 PM',
  },
];

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('puzzle')
    .setDescription('Solve a random level 1 puzzle!'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const puzzle = level1Puzzles[Math.floor(Math.random() * level1Puzzles.length)];

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      puzzle.options.map((opt) =>
        new ButtonBuilder()
          .setCustomId(`puzzle:answer:${opt}`)
          .setLabel(opt)
          .setStyle(ButtonStyle.Primary)
      )
    );

    await interaction.reply({
      content: `🧠 **${puzzle.type.toUpperCase()}**
${puzzle.question}`,
      components: [row],
      flags: [MessageFlags.Ephemeral],
    });

    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 15000,
      max: 1,
    });

    collector?.on('collect', async (btnInteraction:any) => {
      if (btnInteraction.user.id !== interaction.user.id) {
        return btnInteraction.reply({
          content: 'This is not your puzzle!',
          ephemeral: true,
        });
      }

      const chosen = btnInteraction.customId.split(':')[2];
      const isCorrect = chosen === puzzle.answer;

      await btnInteraction.update({
        content: isCorrect
          ? `✅ Correct! **${puzzle.answer}** was the right answer.
🎉 +10 Merit | 🧠 +1 Hint`
          : `❌ Wrong! The correct answer was **${puzzle.answer}**.
🔻 -5 Sanity | ⚠️ +5 Suspicion`,
        components: [],
      });
    });
  },
});
