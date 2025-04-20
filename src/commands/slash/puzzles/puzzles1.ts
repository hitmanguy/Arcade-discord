import { RegisterType, SlashCommand } from '../../../handler';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
  ComponentType,
  EmbedBuilder,
  ColorResolvable
} from 'discord.js';
import { User } from '../../../model/user_status';
import { UserService } from '../../../services/user_services';
import { STORYLINE, PRISON_COLORS, PUZZLE_REWARDS, SANITY_EFFECTS, createProgressBar } from '../../../constants/GAME_CONSTANTS';

// Define puzzle types and pool
const puzzles = [
    {
        question: "What has keys, but no locks; space, but no room; and you can enter, but can't go in?",
        answer: "keyboard",
        hint: "You use it to type"
    },
    {
        question: "I am not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?",
        answer: "fire",
        hint: "I bring light and warmth"
    },
    {
        question: "The more you take, the more you leave behind. What am I?",
        answer: "footsteps",
        hint: "Think about walking"
    },
    // Add more puzzles as needed
];

type Puzzle = {
  id: string;
  type: 'riddle' | 'trivia' | 'math';
  question: string;
  options: string[];
  answer: string;
  flavor?: string;
  reward: number;
  sanityImpact: { success: number; failure: number };
  image?: string;
};

const level1Puzzles: Puzzle[] = [
  {
    id: 'riddle_clock',
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

const PUZZLE_THEMES: Record<Puzzle['type'], ColorResolvable> = {
  riddle: '#9C27B0',
  trivia: '#2196F3',
  math: '#4CAF50'
};

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('puzzle')
    .setDescription('Solve a random level 1 puzzle!'),

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

    const puzzle = level1Puzzles[Math.floor(Math.random() * level1Puzzles.length)];
    
    // Apply sanity effects to the puzzle
    if (user.sanity < 50) {
      // Add visual corruption to the question
      puzzle.question = user.sanity < 30 
        ? corruptText(puzzle.question) 
        : addGlitches(puzzle.question);
      
      // Randomly swap options at low sanity
      if (user.sanity < 40 && Math.random() < 0.3) {
        const i = Math.floor(Math.random() * puzzle.options.length);
        const j = Math.floor(Math.random() * puzzle.options.length);
        [puzzle.options[i], puzzle.options[j]] = [puzzle.options[j], puzzle.options[i]];
      }
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      puzzle.options.map((opt) =>
        new ButtonBuilder()
          .setCustomId(`puzzle:answer:${opt}`)
          .setLabel(opt)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔍')
      )
    );

    const storylineData = STORYLINE.puzzles1;
    const puzzleEmbed = new EmbedBuilder()
      .setColor(user.sanity < 30 ? PRISON_COLORS.danger : PUZZLE_THEMES[puzzle.type])
      .setTitle(`${getTypeEmoji(puzzle.type)} ${puzzle.type.toUpperCase()} CHALLENGE`)
      .setDescription(
        `${storylineData.flavorText}\n\n` +
        (user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : '') +
        `**${puzzle.question}**`
      )
      .setThumbnail(puzzle.image || null)
      .addFields(
        { name: '🎯 Reward', value: `${puzzle.reward} Merit Points`, inline: true },
        { name: '⏳ Time', value: '15 seconds', inline: true },
        { name: '🧠 Sanity', value: `${createProgressBar(user.sanity, 100)} ${user.sanity}%`, inline: true }
      )
      .setFooter({ text: user.sanity < 50 ? 'R̷e̷a̶l̷i̷t̵y̴ ̶i̸s̵ ̶b̷r̵e̸a̵k̷i̶n̶g̷ ̵d̵o̷w̷n̵.̸.̶.' : 'Choose wisely...' });

    await interaction.editReply({
      embeds: [puzzleEmbed],
      components: [row]
    });

    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 15000,
      max: 1,
    });

    collector?.on('collect', async (btnInteraction) => {
      if (btnInteraction.user.id !== interaction.user.id) {
        await btnInteraction.reply({
          content: 'This puzzle isn\'t meant for you...',
          ephemeral: true,
        });
        return;
      }

      const chosen = btnInteraction.customId.split(':')[2];
      const isCorrect = chosen === puzzle.answer;

      // Calculate rewards and penalties
      const baseReward = PUZZLE_REWARDS[puzzle.type === 'riddle' ? 'medium' : 'easy'];
      const meritChange = isCorrect ? baseReward.success.meritPoints : baseReward.failure.meritPoints;
      const sanityChange = isCorrect ? baseReward.success.sanity : baseReward.failure.sanity;
      
      // Add suspicion for rapid failures
      let suspicionChange = 0;
      if (!isCorrect) {
        const recentFailures = user.puzzleProgress
          .filter(p => !p.completed && 
                      p.lastPlayed && 
                      Date.now() - p.lastPlayed.getTime() < 300000) // Last 5 minutes
          .length;
        suspicionChange = Math.min(recentFailures * 5, 15);
      }

      // Update user stats and puzzle progress
      await Promise.all([
        UserService.updateUserStats(interaction.user.id, {
          meritPoints: user.meritPoints + meritChange,
          sanity: Math.min(Math.max(user.sanity + sanityChange, 0), 100),
          suspiciousLevel: Math.min(user.suspiciousLevel + suspicionChange, 100),
          totalGamesPlayed: user.totalGamesPlayed + 1,
          totalGamesWon: user.totalGamesWon + (isCorrect ? 1 : 0),
          currentStreak: isCorrect ? user.currentStreak + 1 : 0
        }),
        UserService.updatePuzzleProgress(interaction.user.id, 'puzzles1', isCorrect)
      ]);

      // Apply sanity effects to the result message
      const resultMessage = isCorrect 
        ? getSuccessMessage()
        : user.sanity < 40 ? corruptText(getFailureMessage()) : getFailureMessage();

      // Update result embed with progress tracking
      const resultEmbed = new EmbedBuilder()
        .setColor(isCorrect ? PRISON_COLORS.success : PRISON_COLORS.danger)
        .setTitle(isCorrect ? '🌟 Correct!' : '💫 Not Quite...')
        .setDescription(
          `${isCorrect 
            ? `Brilliant deduction! **${puzzle.answer}** was indeed the answer.`
            : `The answer was **${puzzle.answer}**.`}\n\n${resultMessage}`
        )
        .addFields(
          { name: '📊 Results', value: 
            `Merit Points: ${meritChange >= 0 ? '+' : ''}${meritChange}\n` +
            `Sanity: ${sanityChange >= 0 ? '+' : ''}${sanityChange}\n` +
            `Streak: ${isCorrect ? user.currentStreak + 1 : '0'}` +
            (suspicionChange > 0 ? `\n⚠️ Suspicion: +${suspicionChange}` : '')
          }
        )
        .setFooter({ text: user.sanity < 30 
          ? 'T̷h̸e̵ ̷w̶a̵l̷l̴s̷ ̶h̵a̷v̶e̷ ̵e̷y̶e̵s̷.̵.̸.' 
          : isCorrect ? 'Your mind grows stronger...' : 'Keep pushing forward...' 
        });

      await btnInteraction.update({
        embeds: [resultEmbed],
        components: []
      });
    });

    collector?.on('end', (collected) => {
      if (collected.size === 0) {
        const timeoutEmbed = new EmbedBuilder()
          .setColor(PRISON_COLORS.warning)
          .setTitle('⏰ Time\'s Up!')
          .setDescription(user.sanity < 40 
            ? 'T̵i̸m̵e̵ ̸s̵l̷i̷p̴s̵ ̶t̷h̷r̴o̵u̷g̶h̴ ̶y̴o̶u̷r̵ ̷f̵i̸n̸g̷e̵r̴s̶.̷.̶.'
            : 'The moment has passed...\nPerhaps speed is as important as wisdom.'
          )
          .setFooter({ text: 'Try another puzzle with /puzzle' });

        interaction.editReply({
          embeds: [timeoutEmbed],
          components: []
        });

        // Penalize for timeout
        UserService.updateUserStats(interaction.user.id, {
          sanity: Math.max(user.sanity - 2, 0),
          currentStreak: 0
        });
      }
    });
  },
});

// Utility functions for sanity effects
function corruptText(text: string): string {
  return text.split('').map(char => 
    Math.random() < 0.3 ? char + '\u0336' : char
  ).join('');
}

function addGlitches(text: string): string {
  const glitches = ['̷', '̶', '̸', '̵', '̴'];
  return text.split('').map(char => 
    Math.random() < 0.15 ? char + glitches[Math.floor(Math.random() * glitches.length)] : char
  ).join('');
}

function getRandomGlitchMessage(): string {
  const messages = SANITY_EFFECTS.glitchMessages;
  return messages[Math.floor(Math.random() * messages.length)];
}

function getTypeEmoji(type: Puzzle['type']): string {
  switch (type) {
    case 'riddle': return '🧩';
    case 'trivia': return '📚';
    case 'math': return '🔢';
  }
}

function getSuccessMessage(): string {
  const messages = [
    'Your mind pierces through the veil of confusion...',
    'Another piece of the puzzle falls into place...',
    'Knowledge is power, and you grow stronger...',
    'The shadows recede as understanding dawns...',
    'Your wit serves you well in these dark times...'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getFailureMessage(): string {
  const messages = [
    'The answer slips through your fingers like sand...',
    'So close, yet the truth remains elusive...',
    'Sometimes the obvious answer isn\'t the right one...',
    'Learn from this moment, grow stronger...',
    'The darkness clouds your judgment, but hope remains...'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
function getColorFromPrisonColor(colorKey: keyof typeof PRISON_COLORS): ColorResolvable {
  return PRISON_COLORS[colorKey] as ColorResolvable;
}
