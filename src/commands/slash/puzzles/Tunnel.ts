import { RegisterType, SlashCommand } from '../../../handler';
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
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
    .setDescription('Memorize the tunnel sequence and recall it!'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sequence = generateTunnelSequence();
    const sequenceStr = sequence.join(' → ');

    // Send initial direction message
    await interaction.reply({
      content: `🚨 Memorize this tunnel sequence:\n\n**${sequenceStr}**`,
      ephemeral: true,
    });

    // Prepare the modal ahead of time
    const modal = new ModalBuilder()
      .setCustomId('tunnelrace_modal')
      .setTitle('Tunnel Challenge');

    const input = new TextInputBuilder()
      .setCustomId('sequence_input')
      .setLabel('Enter the tunnel sequence:')
      .setPlaceholder('e.g., Left Right Forward')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
    modal.addComponents(row);

    // After 1.5 seconds, edit message and show modal
    setTimeout(async () => {
      try {
        await interaction.editReply({
          content: `😈 The tunnel faded into darkness...\n👇 Enter the sequence below:`,
        });

        await interaction.showModal(modal);
      } catch (err) {
        console.error('❌ Error showing modal:', err);
      }
    }, 1500);

    // Wait for user input in the modal
    const submission = await interaction.awaitModalSubmit({
      filter: i => i.customId === 'tunnelrace_modal' && i.user.id === interaction.user.id,
      time: 15000,
    }).catch(() => null);

    if (!submission) {
      await interaction.followUp({
        content: `⏱️ You hesitated too long.`,
        ephemeral: true,
      });
      return;
    }

    // Echo the input
    const userInput = submission.fields.getTextInputValue('sequence_input');
    await submission.reply({
      content: `📝 You entered: \`${userInput}\``,
      ephemeral: true,
    });
  },
});



        
