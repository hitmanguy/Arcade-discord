import { RegisterType, SlashCommand } from '../../../handler';
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  ComponentType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
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

    // Show the sequence briefly
    await interaction.reply({
      content: `🚨 Memorize this tunnel sequence:

**${sequenceStr}**`,
      ephemeral: true,
    });

    // Wait 1.5 seconds then edit to hide it
    setTimeout(async () => {
      await interaction.editReply({
        content: `😈 The tunnel faded into darkness...\nType the correct sequence (e.g., Left Right Forward):`,
      });

      // Show a modal to input the answer
      const modal = new ModalBuilder()
        .setCustomId('tunnelrace_modal')
        .setTitle('Tunnel Sequence')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('sequence_input')
              .setLabel('Enter the sequence')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('E.g., Left Right Forward')
              .setRequired(true)
          )
        );

      await interaction.showModal(modal);

      // Wait for input
      const submission = await interaction.awaitModalSubmit({
        filter: (i) => i.customId === 'tunnelrace_modal' && i.user.id === interaction.user.id,
        time: 15000,
      }).catch(() => null);

      if (!submission) {
        await interaction.editReply({
          content: `⏱️ You hesitated too long!\n🔻 -5 Sanity | ⚠️ +2 Suspicion`,
        });
        // TODO: Update player stats here (e.g., decrease Sanity, increase Suspicion)
        // example:
        // await updateStats(interaction.user.id, { sanity: -5, suspicion: +2 });

        return;
      }

      const answer = submission.fields.getTextInputValue('sequence_input').trim().toLowerCase().replace(/ +/g, ' ');
      const correctAnswer = sequence.map(s => s.toLowerCase()).join(' ');

      if (answer === correctAnswer) {
        await submission.reply({
          content: `✅ You dashed perfectly through the tunnel!\n🎉 +10 Merit | 🧠 +5 Sanity`,
          ephemeral: true,
        });
      } else {
        await submission.reply({
          content: `❌ Wrong turn! The correct sequence was **${sequence.join(' → ')}**.\n🔻 -5 Sanity | ⚠️ +2 Suspicion`,
          ephemeral: true,
        });
      }
    }, 1500);
  },
});
