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

const colours = ['Red', 'Green', 'Yellow', 'Blue'];
const values = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'Draw Two', 'Skip', 'Reverse',
];
const wilds = ['Wild', 'Wild Draw Four'];

function buildDeck(): string[] {
  const deck: string[] = [];
  for (const colour of colours) {
    for (const value of values) {
      const cardVal = `${colour} ${value}`;
      deck.push(cardVal);
      if (value !== '0') deck.push(cardVal);
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push(...wilds);
  }
  return deck;
}

function shuffleDeck(deck: string[]): string[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function canPlay(colour: string, value: string, playerHand: string[]): boolean {
  return playerHand.some(card =>
    card.includes('Wild') || card.includes(colour) || card.includes(value)
  );
}

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('uno')
    .setDescription('Draw a hand and try to play a card against the top discard!'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    let deck = shuffleDeck(shuffleDeck(buildDeck()));
    const hand = deck.splice(0, 7);
    const discard = deck.shift()!;

    const [currentColour, ...rest] = discard.split(' ');
    const currentValue = rest.join(' ') || 'Any';

    const playable = hand.filter(card => canPlay(currentColour, currentValue, [card]));

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      (playable.length ? playable : ['Draw Card']).map((card) =>
        new ButtonBuilder()
          .setCustomId(`uno:play:${card}`)
          .setLabel(card)
          .setStyle(ButtonStyle.Primary)
      )
    );

    await interaction.reply({
      content: `🎮 **UNO TIME**
Top Discard: **${discard}**
Your Hand: ${hand.map(c => `\`${c}\``).join(', ')}`,
      components: [row],
      flags: [MessageFlags.Ephemeral],
    });

    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 15000,
      max: 1,
    });

    collector?.on('collect', async (btnInteraction) => {
      if (btnInteraction.user.id !== interaction.user.id) {
        return btnInteraction.reply({ content: 'This is not your UNO turn!', ephemeral: true });
      }

      const chosen = btnInteraction.customId.split(':')[2];
      const isDraw = chosen === 'Draw Card';
      const isCorrect = playable.includes(chosen);

      await btnInteraction.update({
        content: isDraw
          ? `🃏 You drew a card. Better luck next turn!`
          : `✅ You played **${chosen}** against **${discard}**!
🎯 ${isCorrect ? 'Nice move!' : 'Oops, not playable...'}`,
        components: [],
      });
    });
  },
});
