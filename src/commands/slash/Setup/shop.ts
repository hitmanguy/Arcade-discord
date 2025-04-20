import { RegisterType, SlashCommand } from '../../../handler';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
  ComponentType,
} from 'discord.js';
import { User } from 'src/model/user_status';

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Buy tools to manage sanity and suspicion'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const player = await User.findOne({ discordId: interaction.user.id });
    if (!player) {
        await interaction.reply({ content: 'Player not found.', ephemeral: true });
        return;
      }
      

    const embedContent = `🪙 **Merit Points:** ${player.meritPoints}\n\n` +
      '**Items for Purchase:**\n' +
      '🧪 **Syringe** — Gain +20 Sanity (Cost: 50)\n' +
      '🕒 **Skip a Day** — Lose -25 Suspicion (Cost: 75)\n' +
      '⏱️ **Suspicion Timer** — -1 Suspicion every 5 mins (Cost: 100)\n';

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('buy_syringe').setLabel('🧪 Syringe').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('buy_skip').setLabel('🕒 Skip a Day').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('buy_timer').setLabel('⏱️ Timer').setStyle(ButtonStyle.Success),
    );

    await interaction.reply({
      content: embedContent,
      components: [row],
      flags: [MessageFlags.Ephemeral],
    });

    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60 * 1000,
    });

    collector?.on('collect', async (btnInt) => {
      if (btnInt.user.id !== interaction.user.id) {
        return btnInt.reply({ content: 'You cannot use this shop.', ephemeral: true });
      }

      let response = '';

      switch (btnInt.customId) {
        case 'buy_syringe': {
          if (player.meritPoints >= 50) {
            player.meritPoints -= 50;
            player.sanity = Math.min(100, player.sanity + 20);
            response = '🧪 You bought a Syringe! +20 Sanity';
          } else {
            response = 'Not enough Merit for a Syringe!';
          }
          break;
        }
        case 'buy_skip': {
          if (player.meritPoints >= 75) {
            player.meritPoints -= 75;
            player.suspiciousLevel = Math.max(0, player.suspiciousLevel - 25);
            response = '🕒 You skipped a day! -25 Suspicion';
          } else {
            response = 'Not enough Merit to skip a day!';
          }
          break;
        }
        case 'buy_timer': {
          if (player.meritPoints >= 100) {
            const hasTimer = player.achievements.includes('TIMER_ACTIVE');
            if (hasTimer) {
              response = '⏱️ Timer already active!';
            } else {
              player.meritPoints -= 100;
              player.achievements.push('TIMER_ACTIVE');
              response = '⏱️ Suspicion Timer activated!';
            }
          } else {
            response = 'Not enough Merit to activate timer!';
          }
          break;
        }
      }

      await player.save();
      await btnInt.reply({ content: response, ephemeral: true });
    });
  },
});
