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

// Helper to generate time-based logic puzzle
function generateGuardPuzzle() {
  const intervals = [75, 80, 90, 70];
  const interval = intervals[Math.floor(Math.random() * intervals.length)];

  const startTime = new Date();
  startTime.setHours(2, 30, 0); // 02:30 AM base time

  const patrols: string[] = [];
  for (let i = 0; i < 3; i++) {
    const time = new Date(startTime.getTime() + interval * i * 60000);
    patrols.push(time.toTimeString().substring(0, 5));
  }

  const nextTime = new Date(startTime.getTime() + interval * 3 * 60000);
  const correctAnswer = nextTime.toTimeString().substring(0, 5);

  // Generate some wrong but close options
  const distractors = [
    new Date(nextTime.getTime() + 10 * 60000).toTimeString().substring(0, 5),
    new Date(nextTime.getTime() - 10 * 60000).toTimeString().substring(0, 5),
    new Date(nextTime.getTime() + 20 * 60000).toTimeString().substring(0, 5),
  ];

  // Shuffle answers
  const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);

  const question = `🧩 The guard patrols at regular intervals.\nThe last 3 patrols were at: **${patrols.join(', ')}**.\n\n⏰ What time will he patrol next?`;

  return { question, options, correctAnswer };
}

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('puzzle')
    .setDescription('Solve a tricky prison logic puzzle!'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const { question, options, correctAnswer } = generateGuardPuzzle();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      options.map((opt) =>
        new ButtonBuilder()
          .setCustomId(`puzzle:answer:${opt}`)
          .setLabel(opt)
          .setStyle(ButtonStyle.Primary)
      )
    );

    await interaction.reply({
      content: question,
      components: [row],
      flags: [MessageFlags.Ephemeral],
    });

    // Create collector to handle button press
    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 15000,
      max: 1,
    });

    collector?.on('collect', async (btnInteraction) => {
      if (btnInteraction.user.id !== interaction.user.id) {
        return btnInteraction.reply({ content: 'This is not your puzzle!', ephemeral: true });
      }

      const chosen = btnInteraction.customId.split(':')[2];
      const isCorrect = chosen === correctAnswer;

      await btnInteraction.update({
        content: isCorrect
          ? `✅ Correct! The guard's next patrol is at **${correctAnswer}**.\n🎉 +10 Merit | 🧠 +1 Hint`
          : `❌ Wrong! The correct time was **${correctAnswer}**.\n🔻 -5 Sanity | ⚠️ +5 Suspicion`,
        components: [],
      });

      // Here you could log stats, update DB, etc.
    });
  },
});
