import { RegisterType, SlashCommand } from '../../../handler';
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ModalBuilder,
  MessageFlags,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';

function generateTunnelSequence(difficulty: number = 1): string[] {
  const baseLength = 3;
  const length = baseLength + difficulty;
  const directions = ['⬅️ Left', '➡️ Right', '⬆️ Forward', '⬇️ Backward'];
  return Array.from({ length }, () =>
    directions[Math.floor(Math.random() * directions.length)]
  );
}

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('tunnel')
    .setDescription('Navigate through the infinite prison tunnels!')
    .addIntegerOption(option =>
      option
        .setName('difficulty')
        .setDescription('Choose difficulty level (1-5)')
        .setMinValue(1)
        .setMaxValue(5)
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const difficulty = interaction.options.getInteger('difficulty') || 1;
    const sequence = generateTunnelSequence(difficulty);
    const correctAnswer = sequence.map(s => s.replace(/[^a-zA-Z]/g, '').toLowerCase()).join(' ');

    const introEmbed = new EmbedBuilder()
      .setColor('#5539cc')
      .setTitle('🌀 Tunnel Challenge Initiated')
      .setDescription(`**Level ${difficulty} | Mode: Memory Sequence**\n\nPrepare to memorize the directions one by one...`);

    await interaction.reply({
      embeds: [introEmbed],
      flags: MessageFlags.Ephemeral
    });

    for (let i = 0; i < sequence.length; i++) {
      const stepEmbed = new EmbedBuilder()
        .setColor('#00bfff')
        .setTitle(`Step ${i + 1} of ${sequence.length}`)
        .setDescription(`🧠 Memorize: **${sequence[i]}**`);

      await interaction.followUp({ embeds: [stepEmbed], flags: MessageFlags.Ephemeral });
      await new Promise(r => setTimeout(r, 1200));
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('hint')
        .setLabel('🔍 Hint')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('enter')
        .setLabel('📝 Enter Sequence')
        .setStyle(ButtonStyle.Primary)
    );

    const optionsEmbed = new EmbedBuilder()
      .setColor('#ffaa00')
      .setTitle('⏳ Your Turn')
      .setDescription('Now enter the sequence you just saw. You can use a **Hint** if needed.');

    const followup = await interaction.followUp({
      embeds: [optionsEmbed],
      components: [row],
      flags: MessageFlags.Ephemeral
    });

    const btnInteraction = await followup.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 15000
    }).catch(() => null);

    if (!btnInteraction) {
      const timeoutEmbed = new EmbedBuilder()
        .setColor('#ff5555')
        .setTitle('❌ Time Out')
        .setDescription('You took too long to respond!');

      await interaction.followUp({ embeds: [timeoutEmbed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (btnInteraction.customId === 'hint') {
      await btnInteraction.reply({
        content: `📌 Hint: First direction is **${sequence[0]}**.`,
        flags: MessageFlags.Ephemeral
      });

      const hintRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('enter')
          .setLabel('📝 Enter Sequence')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.followUp({
        content: 'When ready, enter the sequence.',
        components: [hintRow],
        flags: MessageFlags.Ephemeral
      });

      await new Promise(r => setTimeout(r, 2000));
    }

    const modal = new ModalBuilder()
      .setCustomId('tunnel_modal')
      .setTitle(`Tunnel Navigation - Level ${difficulty}`);

    const input = new TextInputBuilder()
      .setCustomId('sequence_input')
      .setLabel('Enter the full sequence')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., left right forward backward')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(input)
    );

    await btnInteraction.showModal(modal);

    const submission = await btnInteraction.awaitModalSubmit({
      filter: (i) => i.customId === 'tunnel_modal' && i.user.id === interaction.user.id,
      time: 20000,
    }).catch(() => null);

    if (!submission) {
      await interaction.followUp({
        content: '❌ You took too long to respond.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const answer = submission.fields.getTextInputValue('sequence_input')
      .trim().toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ');

    const matchRatio = answer.split(' ').filter((word, i) => word === correctAnswer.split(' ')[i]).length / sequence.length;

    if (matchRatio === 1) {
      await submission.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00ff99')
            .setTitle('✅ Success!')
            .setDescription('You flawlessly navigated the tunnel!')
            .addFields(
              { name: 'Rewards', value: `🎖️ +${10 * difficulty} Merit\n🧠 +${5 * difficulty} Sanity` }
            )
        ],
        flags: MessageFlags.Ephemeral
      });
    } else {
      const retryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('retry')
          .setLabel('🔁 Retry')
          .setStyle(ButtonStyle.Danger)
      );

      const failMsg = await submission.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff5555')
            .setTitle('❌ Failure')
            .setDescription(`You got **${Math.round(matchRatio * 100)}%** correct.`)
            .addFields(
              { name: 'Correct Answer', value: correctAnswer },
              { name: 'Penalties', value: '⚠️ +2 Suspicion\n🔻 -5 Sanity' }
            )
        ],
        components: [retryRow],
        flags: MessageFlags.Ephemeral
      });

      const retryCollector = failMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 10000,
        filter: (btn) => btn.customId === 'retry' && btn.user.id === interaction.user.id
      });

      retryCollector.on('collect', async (btn) => {
        await btn.update({
          content: '🔁 Retrying challenge... use `/tunnel` again!',
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId('retry')
                .setLabel('🔁 Retry')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true)
            )
          ],
          embeds: []
        });
      });
    }
  },
});