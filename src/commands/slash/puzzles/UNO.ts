// UNO.ts
import { RegisterType, SlashCommand } from '../../../handler';
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags
} from 'discord.js';

const deck = [
  'RED 1', 'RED 1', 'BLUE 1', 'BLUE 1', 'YELLOW 1', 'YELLOW 1', 'GREEN 1', 'GREEN 1',
  'RED 2', 'RED 2', 'BLUE 2', 'BLUE 2', 'YELLOW 2', 'YELLOW 2', 'GREEN 2', 'GREEN 2',
  'RED 3', 'RED 3', 'BLUE 3', 'BLUE 3', 'YELLOW 3', 'YELLOW 3', 'GREEN 3', 'GREEN 3',
  'RED 4', 'RED 4', 'BLUE 4', 'BLUE 4', 'YELLOW 4', 'YELLOW 4', 'GREEN 4', 'GREEN 4',
  'RED 5', 'RED 5', 'BLUE 5', 'BLUE 5', 'YELLOW 5', 'YELLOW 5', 'GREEN 5', 'GREEN 5',
  'RED 6', 'RED 6', 'BLUE 6', 'BLUE 6', 'YELLOW 6', 'YELLOW 6', 'GREEN 6', 'GREEN 6',
  'RED 7', 'RED 7', 'BLUE 7', 'BLUE 7', 'YELLOW 7', 'YELLOW 7', 'GREEN 7', 'GREEN 7',
  'RED 8', 'RED 8', 'BLUE 8', 'BLUE 8', 'YELLOW 8', 'YELLOW 8', 'GREEN 8', 'GREEN 8',
  'RED 9', 'RED 9', 'BLUE 9', 'BLUE 9', 'YELLOW 9', 'YELLOW 9', 'GREEN 9', 'GREEN 9',
  'RED 0', 'BLUE 0', 'YELLOW 0', 'GREEN 0',
  'RED +2', 'RED +2', 'RED REV', 'RED REV', 'RED SKIP', 'RED SKIP',
  'BLUE +2', 'BLUE +2', 'BLUE REV', 'BLUE REV', 'BLUE SKIP', 'BLUE SKIP',
  'YELLOW +2', 'YELLOW +2', 'YELLOW REV', 'YELLOW REV', 'YELLOW SKIP', 'YELLOW SKIP',
  'GREEN +2', 'GREEN +2', 'GREEN REV', 'GREEN REV', 'GREEN SKIP', 'GREEN SKIP',
  'WILD', 'WILD', 'WILD', 'WILD',
  '+4', '+4', '+4', '+4'
];

function dealHand(count = 7): string[] {
  deck.sort(() => Math.random() - 0.5);
  const hand = [];
  for (let i = 0; i < count; i++) {
    hand.push(deck.pop()!);
  }
  return hand;
}

export default new SlashCommand({
  registerType: RegisterType.Guild,
  data: new SlashCommandBuilder()
    .setName('uno')
    .setDescription('Start a single-player UNO match!'),

  async execute(interaction: ChatInputCommandInteraction) {
    const playerHand = dealHand();
    const aiHand = dealHand();
    const topCard = deck.pop()!;

    // Create embed showing game status
    const embed = new EmbedBuilder()
      .setTitle('🎮 UNO - Your Move!')
      .setDescription(`🃏 Top Card: **${topCard}**\n\nYour Hand:\n${playerHand.map((c) => `• ${c}`).join('\n')}`)
      .setColor('Random');

    // Create buttons for player's hand (max 5 per row)
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    for (let i = 0; i < playerHand.length; i += 5) {
      const slice = playerHand.slice(i, i + 5);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        slice.map((card) =>
          new ButtonBuilder()
            .setCustomId(`uno_card_${card}`)
            .setLabel(card)
            .setStyle(ButtonStyle.Primary)
        )
      );
      rows.push(row);
    }

    await interaction.reply({
      embeds: [embed],
      components: rows,
      flags: [MessageFlags.Ephemeral],
    });

    // Ready for future: collector, move validation, AI turns
  },
});
