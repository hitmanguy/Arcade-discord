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
    const correctAnswer = sequence.map(s => s.toLowerCase()).join(' ');

    // Defer reply first to avoid interaction errors
    await interaction.deferReply({ ephemeral: true });

    // Send the sequence to memorize
    const shown = await interaction.followUp({
      content: `🚨 Memorize this tunnel sequence:\n\n**${sequenceStr}**`,
      ephemeral: true,
    });

    /*
    // Create modal ahead of time
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
    */
      const modal: ModalBuilder = new ModalBuilder()
      .setCustomId('tunnelrace_modal')
      .setTitle('Tunnel Sequence');

    const colorInput: TextInputBuilder = new TextInputBuilder()
      .setCustomId('sequence_input')
      .setLabel("Enter the sequence")
      .setPlaceholder('E.g., Left Right Forward')
      .setStyle(TextInputStyle.Short);

    
    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(colorInput)
    );

    // Wait 1.5 seconds, then show the modal
    setTimeout(async () => {
      try {
        await interaction.showModal(modal);
      } catch (err) {
        console.error('❌ Error showing modal:', err);
      }
    }, 1500);

    // Wait for modal input
    const submission = await interaction.awaitModalSubmit({
      filter: (i) => i.customId === 'tunnelrace_modal' && i.user.id === interaction.user.id,
      time: 15000,
    }).catch(() => null);

    if (!submission) {
      await interaction.followUp({
        content: `⏱️ You hesitated too long!\n🔻 -5 Sanity | ⚠️ +2 Suspicion`,
        ephemeral: true,
      });
      return;
    }

    const answer = submission.fields.getTextInputValue('sequence_input').trim().toLowerCase().replace(/ +/g, ' ');

    if (answer === correctAnswer) {
      await submission.reply({
        content: `✅ You dashed perfectly through the tunnel!\n🎉 +10 Merit | 🧠 +5 Sanity`,
        ephemeral: true,
      });

      // 🔧 Place to add stat update: increase Merit, Sanity
      // await updateStats(userId, { merit: +10, sanity: +5 });

    } else {
      await submission.reply({
        content: `❌ Wrong turn! The correct sequence was **${sequenceStr}**.\n🔻 -5 Sanity | ⚠️ +2 Suspicion`,
        ephemeral: true,
      });

      // 🔧 Place to add stat update: decrease Sanity, increase Suspicion
      // await updateStats(userId, { sanity: -5, suspicion: +2 });
    }
  },
});
