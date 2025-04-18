import { RegisterType, SlashCommand } from '../../../handler';
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  TextInputBuilder,
  ModalBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';

function generateTunnelSequence(length = 4) {
  const directions = ['Left', 'Right', 'Forward', 'Backward'];
  const sequence: string[] = [];
  for (let i = 0; i < length; i++) {
    sequence.push(directions[Math.floor(Math.random() * directions.length)]);
  }
  return sequence;
}

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('tunnelrace')
    .setDescription('Memorize the tunnel sequence and recall it to escape!'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sequence = generateTunnelSequence();
    const sequenceStr = sequence.join(' → ');

    // Step 1: Show the sequence briefly
    await interaction.reply({
      content: `🚨 Memorize this tunnel sequence:\n\n**${sequenceStr}**`,
      ephemeral: true,
    });

    // Step 2: Build the modal ahead of time
    const modal = new ModalBuilder()
      .setCustomId('tunnelrace_modal')
      .setTitle('Tunnel Sequence')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('sequence_input')
            .setLabel('Enter the sequence')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('E.g., Left Right Forward Backward')
            .setRequired(true)
        )
      );

    // Step 3: Wait 1.5s and show the modal
    setTimeout(async () => {
      try {
        await interaction.showModal(modal);
      } catch (err) {
        console.error('Error showing modal:', err);
      }
    }, 1500);

    // Step 4: Wait for response
    const submission = await interaction.awaitModalSubmit({
      filter: (i) =>
        i.customId === 'tunnelrace_modal' &&
        i.user.id === interaction.user.id,
      time: 15000,
    }).catch(() => null);

    if (!submission) {
      await interaction.followUp({
        content: `⏱️ You hesitated too long!\n🔻 -5 Sanity | ⚠️ +2 Suspicion`,
        ephemeral: true,
      });
      // 🛠️ TODO: Add stat update here
      return;
    }

    // Step 5: Process answer
    const answer = submission.fields.getTextInputValue('sequence_input')
      .trim()
      .toLowerCase()
      .replace(/ +/g, ' ');

    const correctAnswer = sequence.map((s) => s.toLowerCase()).join(' ');

    if (answer === correctAnswer) {
      await submission.reply({
        content: `✅ You dashed perfectly through the tunnel!\n🎉 +10 Merit | 🧠 +5 Sanity`,
        ephemeral: true,
      });
      // 🛠️ TODO: Add stat update here (e.g., +10 merit, +5 sanity)
    } else {
      await submission.reply({
        content: `❌ Wrong turn! The correct sequence was **${sequenceStr}**.\n🔻 -5 Sanity | ⚠️ +2 Suspicion`,
        ephemeral: true,
      });
      // 🛠️ TODO: Add stat update here (e.g., -5 sanity, +2 suspicion)
    }
  },
});
