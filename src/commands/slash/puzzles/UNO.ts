import { RegisterType, SlashCommand } from '../../../handler';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

const colours = ['Red', 'Green', 'Yellow', 'Blue'];
const values = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'Draw Two', 'Skip', 'Reverse',
];
const wilds = ['Wild', 'Draw Four'];

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
  if (card.includes('Wild') || card.includes('Draw Four')) return true;
  const [topColour, ...topVal] = topCard.split(' ');
  const topValue = topVal.join(' ');
  return card.includes(topColour) || card.includes(topValue);
}

function getValidStartingCard(deck: string[]): string {
  let card = deck.shift()!;
  while (card.includes('Wild') || card.includes('Skip') || card.includes('Reverse') || card.includes('Draw Four')) {
    deck.push(card);
    card = deck.shift()!;
  }
  return card;
}

function reshuffleIfNeeded(deck: string[], discardPile: string[]): void {
  if (deck.length === 0 && discardPile.length > 1) {
    const top = discardPile.pop()!;
    deck.push(...shuffleDeck(discardPile.splice(0)));
    discardPile.push(top);
  }
}

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('uno')
    .setDescription('Play a quick 4-card UNO match vs bot!'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    let deck = shuffleDeck(buildDeck());

    const playerHand = deck.splice(0, 4);
    const botHand = deck.splice(0, 4);
    const discardPile: string[] = [getValidStartingCard(deck)];
    let topCard = discardPile[0];
    let currentColor = topCard.split(' ')[0];
    let isPlayerTurn = true;

    const playTurn = async () => {
      if (playerHand.length === 0) {
        await interaction.followUp({ content: '🎉 You win! You played all your cards!', ephemeral: true });
        return;
      }
      if (botHand.length === 0) {
        await interaction.followUp({ content: '😢 Bot wins! Better luck next time.', ephemeral: true });
        return;
      }

      reshuffleIfNeeded(deck, discardPile);

      if (isPlayerTurn) {
        const playable = playerHand.filter(c => canPlay(topCard, c));
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          (playable.length ? playable : ['Draw Card']).map(card =>
            new ButtonBuilder()
              .setCustomId(`uno:play:${card}`)
              .setLabel(card)
              .setStyle(ButtonStyle.Primary)
          )
        );

        await interaction.editReply({
          content: `🎮 **UNO**\nTop Card: **${topCard}**\nYour Hand: ${playerHand.map(c => `\`${c}\``).join(', ')}\nBot Hand: ${'🂠'.repeat(botHand.length)}`,
          components: [row],
        });

        const collector = interaction.channel?.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 30000,
          max: 1,
        });

        collector?.on('collect', async (btnInteraction) => {
          if (btnInteraction.user.id !== interaction.user.id) {
            return btnInteraction.reply({ content: 'This is not your game!', flags: [MessageFlags.Ephemeral] });
          }

          const chosen = btnInteraction.customId.split(':')[2];

          if (chosen === 'Draw Card') {
            reshuffleIfNeeded(deck, discardPile);
            const newCard = deck.shift()!;
            playerHand.push(newCard);
            await btnInteraction.update({ content: `🃏 You drew \`${newCard}\`.`, components: [] });
            isPlayerTurn = false;
            return setTimeout(playTurn, 2000);
          }

          if (!canPlay(topCard, chosen)) {
            await btnInteraction.update({ content: `❌ \`${chosen}\` can't be played.`, components: [] });
            return setTimeout(playTurn, 2000);
          }

          playerHand.splice(playerHand.indexOf(chosen), 1);
          discardPile.push(chosen);
          topCard = chosen;

          if (chosen.includes('Wild') || chosen.includes('Draw Four')) {
            const selectId = `uno:choosecolor:${Date.now()}`;
            const colorSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId(selectId)
                .setPlaceholder('Choose a color')
                .addOptions(colours.map(color => new StringSelectMenuOptionBuilder().setLabel(color).setValue(color)))
            );

            await btnInteraction.update({ content: '🎨 Choose a color:', components: [colorSelect] });
            const colorCollector = interaction.channel?.createMessageComponentCollector({
              componentType: ComponentType.StringSelect,
              time: 15000,
              max: 1,
              filter: int => int.customId === selectId
            });
            colorCollector?.on('collect', async (selectInt) => {
              if (selectInt.user.id !== interaction.user.id) return;
              currentColor = selectInt.values[0];
              if (chosen.includes('Draw Four')) {
                reshuffleIfNeeded(deck, discardPile);
                botHand.push(...deck.splice(0, 4));
              }
              await selectInt.update({ content: `You chose **${currentColor}**. You played \`${chosen}\`.`, components: [] });
              isPlayerTurn = false;
              setTimeout(playTurn, 2000);
            });
            return;
          }

          currentColor = chosen.split(' ')[0];

          if (chosen.includes('Draw Two')) {
            reshuffleIfNeeded(deck, discardPile);
            botHand.push(...deck.splice(0, 2));
          }

          if (chosen.includes('Skip') || chosen.includes('Reverse')) {
            await btnInteraction.update({ content: `You played \`${chosen}\`. Bot's turn skipped!`, components: [] });
            return setTimeout(() => {
              isPlayerTurn = true;
              playTurn();
            }, 2000);
          }

          await btnInteraction.update({ content: `✅ You played \`${chosen}\`.`, components: [] });
          isPlayerTurn = false;
          setTimeout(playTurn, 2000);
        });
      } else {
        const playable = botHand.filter(c => canPlay(topCard, c));
        let chosen: string;
        let botPlayMessage = '';
        if (playable.length === 0) {
          reshuffleIfNeeded(deck, discardPile);
          const drawn = deck.shift()!;
          botHand.push(drawn);
          botPlayMessage = `🤖 Bot drew a card.`;
        } else {
          chosen = playable[Math.floor(Math.random() * playable.length)];
          botHand.splice(botHand.indexOf(chosen), 1);
          discardPile.push(chosen);
          topCard = chosen;
          currentColor = chosen.includes('Wild') || chosen.includes('Draw Four') ? colours[Math.floor(Math.random() * 4)] : chosen.split(' ')[0];

          if (chosen.includes('Draw Four')) {
            reshuffleIfNeeded(deck, discardPile);
            playerHand.push(...deck.splice(0, 4));
          }
          if (chosen.includes('Draw Two')) {
            reshuffleIfNeeded(deck, discardPile);
            playerHand.push(...deck.splice(0, 2));
          }

          if (chosen.includes('Skip') || chosen.includes('Reverse')) {
            botPlayMessage = `🤖 Bot played \`${chosen}\`. Your turn skipped!`;
            isPlayerTurn = false;
          } else {
            botPlayMessage = `🤖 Bot played \`${chosen}\`.`;
            isPlayerTurn = true;
          }
        }

        await interaction.editReply({
          content: `🎮 **UNO**\nTop Card: **${topCard}**\nYour Hand: ${playerHand.map(c => `\`${c}\``).join(', ')}\nBot Hand: ${'🂠'.repeat(botHand.length)}\n${botPlayMessage}`,
          components: [],
        });

        setTimeout(playTurn, 2000);
      }
    };

    await interaction.reply({
      content: `🎮 **UNO** - You vs Bot!`,
      components: [],
      flags: [MessageFlags.Ephemeral],
    });

    setTimeout(playTurn, 1000);
  },
});