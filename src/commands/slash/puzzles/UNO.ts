// UNO.ts
import { RegisterType, SlashCommand } from '../../../handler';
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  MessageFlags,
  ComponentType
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

// Helper to parse card into { color, value }
function parseCard(card: string) {
  const parts = card.split(' ');
  if (parts.length === 1) return { color: null, value: parts[0] };
  return { color: parts[0], value: parts[1] };
}

function isValidPlay(topCard: string, playedCard: string): boolean {
  const top = parseCard(topCard);
  const played = parseCard(playedCard);

  return (
    played.color === top.color ||
    played.value === top.value ||
    played.color === null
  );
}

async function handleCardPlay(
    interaction: ButtonInteraction,
    playerHand: string[],
    topCard: string
  ): Promise<{ newTopCard: string, updatedPlayerHand: string[] } | void> {
    const selectedCard = interaction.customId.split('_').slice(1).join(' ');
    const cardIndex = playerHand.indexOf(selectedCard);
  
    if (cardIndex === -1) {
      await interaction.reply({ content: 'Card not found in your hand.', ephemeral: true });
      return;
    }
  
    if (!isValidPlay(topCard, selectedCard)) {
      await interaction.reply({ content: '❌ You can’t throw this card!', ephemeral: true });
      return;
    }
  
    playerHand.splice(cardIndex, 1);
    const newTopCard = selectedCard;
  
    const updatedComponents = interaction.message.components.map(row => {
        const newRow = new ActionRowBuilder<ButtonBuilder>();
        row.components.forEach(component => {
          if (component.type !== ComponentType.Button) return;
      
          const btn = component as any; // or: const btn = component as ButtonComponent;
      
          const newBtn = ButtonBuilder.from(btn);
          if (btn.customId?.includes(selectedCard)) {
            newBtn.setDisabled(true);
          }
          newRow.addComponents(newBtn);
        });
        return newRow;
      });
      
  
    await interaction.update({
      content: `🃏 You played: ${selectedCard}\n🤖 Bot is thinking...`,
      components: updatedComponents,
    });
  
    return {
      newTopCard,
      updatedPlayerHand: playerHand
    };
  }
  

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('uno')
    .setDescription('Play UNO with bot!'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    let playerHand = dealHand();
    let topCard = deck.pop()!;

    const introEmbed = new EmbedBuilder()
      .setTitle('🎮 UNO - Your Move!')
      .setDescription(`🃏 Top Card: **${topCard}**\n\nYour Hand:\n${playerHand.map((c) => `• ${c}`).join('\n')}`)
      .setColor('Random');

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    for (let i = 0; i < playerHand.length; i += 5) {
      const buttonRow = new ActionRowBuilder<ButtonBuilder>();
      const chunk = playerHand.slice(i, i + 5);

      const buttons = chunk.map((card) =>
        new ButtonBuilder()
          .setCustomId(`card_${card}`) // e.g. "card_RED 5"
          .setLabel(card)
          .setStyle(ButtonStyle.Secondary)
      );

      buttonRow.addComponents(...buttons);
      rows.push(buttonRow);
    }

    const replyMessage = await interaction.reply({
      content: '🎴 Here are your cards:',
      embeds: [introEmbed],
      components: rows,
      fetchReply: true,
      flags: MessageFlags.Ephemeral
    });

    const collector = replyMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000
    });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({ content: 'This isn’t your game!', ephemeral: true });
      }

      const result = await handleCardPlay(btn, playerHand, topCard);
      if (!result) return;

      topCard = result.newTopCard;
      playerHand = result.updatedPlayerHand;

      // TODO: Add your bot's move here
    });

    collector.on('end', () => {
      // Maybe disable buttons or show a "Game over" message
    });
  }
});
