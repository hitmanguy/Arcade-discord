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

function canPlay(topCard: string, card: string): boolean {
  if (card.includes('Wild')) return true;
  const [topColour, ...topVal] = topCard.split(' ');
  const topValue = topVal.join(' ');
  return card.includes(topColour) || card.includes(topValue);
}

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('uno')
    .setDescription('Play a quick 4-card UNO match!'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    let deck = shuffleDeck(shuffleDeck(buildDeck()));

    const hand = deck.splice(0, 4);
    const discardPile: string[] = [deck.shift()!];
    let topCard = discardPile[discardPile.length - 1];

    let playerHand = [...hand];

    const playTurn = async () => {
      const playable = playerHand.filter(card => canPlay(topCard, card));

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        (playable.length ? playable : ['Draw Card']).map((card) =>
          new ButtonBuilder()
            .setCustomId(`uno:play:${card}`)
            .setLabel(card)
            .setStyle(ButtonStyle.Primary)
        )
      );

      await interaction.editReply({
        content: `🎮 **UNO**
Top Card: **${topCard}**
Your Hand: ${playerHand.map(c => `\`${c}\``).join(', ')}`,
        components: [row],
      });

      const collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 20000,
        max: 1,
      });

      collector?.on('collect', async (btnInteraction) => {
        if (btnInteraction.user.id !== interaction.user.id) {
          return btnInteraction.reply({ content: 'This is not your game!', ephemeral: true });
        }

        const chosen = btnInteraction.customId.split(':')[2];
        if (chosen === 'Draw Card') {
          const newCard = deck.shift()!;
          playerHand.push(newCard);
          await btnInteraction.update({
            content: `🃏 You drew \`${newCard}\`.`,
            components: [],
          });
          setTimeout(playTurn, 2000);
          return;
        }

        if (!canPlay(topCard, chosen)) {
          await btnInteraction.update({
            content: `❌ \`${chosen}\` can't be played on \`${topCard}\`.`,
            components: [],
          });
          setTimeout(playTurn, 2000);
          return;
        }

        playerHand = playerHand.filter(c => c !== chosen);
        discardPile.push(chosen);
        topCard = chosen;

        await btnInteraction.update({
          content: `✅ You played \`${chosen}\`.`,
          components: [],
        });

        if (playerHand.length === 0) {
          await interaction.followUp({ content: `🎉 You played all 4 cards! You win!`, ephemeral: true });
        } else {
          setTimeout(playTurn, 2000);
        }
      });
    };

    await interaction.reply({
      content: `🎮 **UNO** - Quick 4 Card Game!`,
      components: [],
      flags: [MessageFlags.Ephemeral],
    });

    setTimeout(playTurn, 1000);
  },
});
