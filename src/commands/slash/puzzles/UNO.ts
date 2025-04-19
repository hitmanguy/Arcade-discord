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

function shuffleDeck(deck: string[]): string[] {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

function dealHand(deck: string[], count = 7): { hand: string[], newDeck: string[] } {
  const newDeck = [...deck];
  const hand = [];
  for (let i = 0; i < count; i++) {
    hand.push(newDeck.pop()!);
  }
  return { hand, newDeck };
}

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

async function botTurn(
  interaction: ButtonInteraction,
  botHand: string[],
  topCard: string
): Promise<{ newTopCard: string, updatedBotHand: string[] }> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const validCards = botHand.filter(card => isValidPlay(topCard, card));
  
  if (validCards.length === 0) {
    const drawnCard = deck.pop()!;
    botHand.push(drawnCard);
    
    await interaction.followUp({
      content: `🤖 Bot has no valid cards and draws a card.`,
      ephemeral: false
    });
    
    if (isValidPlay(topCard, drawnCard)) {
      botHand.pop();
      await interaction.followUp({
        content: `🤖 Bot plays the drawn card: ${drawnCard}`,
        ephemeral: false
      });
      return {
        newTopCard: drawnCard,
        updatedBotHand: botHand
      };
    }
    
    return {
      newTopCard: topCard,
      updatedBotHand: botHand
    };
  }
  
  const specialCards = validCards.filter(card => 
    card.includes('SKIP') || card.includes('REV') || card.includes('+2') || card.includes('+4')
  );
  
  const matchingColorCards = validCards.filter(card => 
    parseCard(card).color === parseCard(topCard).color && !specialCards.includes(card)
  );
  
  const matchingValueCards = validCards.filter(card => 
    parseCard(card).value === parseCard(topCard).value && !specialCards.includes(card)
  );
  
  const wildCards = validCards.filter(card => 
    card === 'WILD' || card === '+4'
  );
  
  let selectedCard: string;
  
  if (botHand.length <= 2 && specialCards.length > 0) {
    selectedCard = specialCards[0];
  } else if (matchingColorCards.length > 0) {
    selectedCard = matchingColorCards[0];
  } else if (matchingValueCards.length > 0) {
    selectedCard = matchingValueCards[0];
  } else if (specialCards.length > 0) {
    selectedCard = specialCards[0];
  } else {
    selectedCard = wildCards[0];
  }
  
  const cardIndex = botHand.indexOf(selectedCard);
  botHand.splice(cardIndex, 1);
  
  if (selectedCard === 'WILD' || selectedCard === '+4') {
    const colorCounts: Record<string, number> = {
      'RED': 0,
      'BLUE': 0,
      'GREEN': 0,
      'YELLOW': 0
    };
    
    botHand.forEach(card => {
      const cardColor = parseCard(card).color;
      if (cardColor && cardColor !== 'WILD') {
        colorCounts[cardColor]++;
      }
    });
    
    const newColor = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
      
    await interaction.followUp({
      content: `🤖 Bot plays: ${selectedCard}\n🤖 Bot chooses color: ${newColor}`,
      ephemeral: false
    });
    
    return {
      newTopCard: newColor + ' ' + selectedCard,
      updatedBotHand: botHand
    };
  }
  
  await interaction.followUp({
    content: `🤖 Bot plays: ${selectedCard}`,
    ephemeral: false
  });
  
  return {
    newTopCard: selectedCard,
    updatedBotHand: botHand
  };
}

async function handleCardPlay(
  interaction: ButtonInteraction,
  playerHand: string[],
  topCard: string
): Promise<{ newTopCard: string, updatedPlayerHand: string[] } | void> {
  const customIdParts = interaction.customId.split('_');
  let selectedCard: string;
  
  if (customIdParts[0] === 'card') {
    if (customIdParts[1] === '+4') {
      selectedCard = '+4';
    } else if (customIdParts.length >= 3 && !isNaN(Number(customIdParts[2]))) {
      selectedCard = customIdParts[1] + ' ' + customIdParts[2];
    } else {
      selectedCard = customIdParts.slice(1, -1).join(' ');
    }
  } else {
    return;
  }

  if (selectedCard === 'WILD' || selectedCard === '+4') {
    return handleWildCardPlay(interaction, playerHand, selectedCard);
  }
  
  const cardIndex = playerHand.indexOf(selectedCard);

  if (cardIndex === -1) {
    await interaction.reply({ content: 'Card not found in your hand.', ephemeral: true });
    return;
  }

  if (!isValidPlay(topCard, selectedCard)) {
    await interaction.reply({ content: '❌ You can\'t throw this card!', ephemeral: true });
    return;
  }

  playerHand.splice(cardIndex, 1);
  const newTopCard = selectedCard;

  const updatedComponents = interaction.message.components.map(row => {
    const newRow = new ActionRowBuilder<ButtonBuilder>();
    row.components.forEach(component => {
      if (component.type !== ComponentType.Button) return;
  
      const btn = component as any;
      const newBtn = ButtonBuilder.from(btn);
      if (btn.customId?.includes(selectedCard.replace(/ /g, '_'))) {
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

async function handleWildCardPlay(
  interaction: ButtonInteraction,
  playerHand: string[],
  selectedCard: string
): Promise<{ newTopCard: string, updatedPlayerHand: string[] } | void> {
  const cardIndex = playerHand.indexOf(selectedCard);
  
  if (cardIndex === -1) {
    await interaction.reply({ content: 'Card not found in your hand.', ephemeral: true });
    return;
  }
  
  const colorRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`wild_RED_${selectedCard}`)
        .setLabel('RED')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`wild_BLUE_${selectedCard}`)
        .setLabel('BLUE')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`wild_GREEN_${selectedCard}`)
        .setLabel('GREEN')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`wild_YELLOW_${selectedCard}`)
        .setLabel('YELLOW')
        .setStyle(ButtonStyle.Secondary)
    );
  
  playerHand.splice(cardIndex, 1);
  
  await interaction.update({
    content: `You played: ${selectedCard}\nPlease select a color:`,
    components: [colorRow],
  });
  
  return;
}

function createPlayerHandButtons(hand: string[]): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  
  for (let i = 0; i < hand.length; i += 5) {
    const buttonRow = new ActionRowBuilder<ButtonBuilder>();
    const chunk = hand.slice(i, i + 5);
    
    chunk.forEach((card, index) => {
      const uniqueId = `card_${card.replace(/ /g, '_')}_${i + index}`;
      buttonRow.addComponents(
        new ButtonBuilder()
          .setCustomId(uniqueId)
          .setLabel(card)
          .setStyle(ButtonStyle.Secondary)
      );
    });
    
    rows.push(buttonRow);
  }
  
  return rows;
}

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('uno')
    .setDescription('Play UNO with bot!'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    let shuffledDeck = shuffleDeck(deck);
    let { hand: playerHand, newDeck } = dealHand(shuffledDeck);
    shuffledDeck = newDeck;
    let topCard = shuffledDeck.pop()!;
    let { hand: botHand, newDeck: remainingDeck } = dealHand(shuffledDeck);
    shuffledDeck = remainingDeck;

    const introEmbed = new EmbedBuilder()
      .setTitle('🎮 UNO - Your Move!')
      .setDescription(`🃏 Top Card: **${topCard}**\n\nYour Hand:\n${playerHand.map((c) => `• ${c}`).join('\n')}`)
      .setColor('Random');

    const rows = createPlayerHandButtons(playerHand);

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
        return btn.reply({ content: 'This isn\'t your game!', ephemeral: true });
      }

      if (btn.customId.startsWith('wild_')) {
        const [_, color, ...cardParts] = btn.customId.split('_');
        const wildCard = cardParts.join(' ');
        const newTopCard = `${color} ${wildCard}`;
        
        await btn.update({
          content: `🃏 You played: ${wildCard} and chose ${color} as the color`,
          components: [],
        });
        
        const botResult = await botTurn(btn, botHand, newTopCard);
        topCard = botResult.newTopCard;
        botHand = botResult.updatedBotHand;
        
        await updateGameState(btn);
        return;
      }

      if (btn.customId === 'draw_card') {
        if (shuffledDeck.length === 0) {
          await btn.reply({ content: 'No cards left in the deck!', ephemeral: true });
          return;
        }
        
        const drawnCard = shuffledDeck.pop()!;
        playerHand.push(drawnCard);
        
        await btn.update({
          content: `You drew: ${drawnCard}`,
          components: createPlayerHandButtons(playerHand),
        });
        
        const botResult = await botTurn(btn, botHand, topCard);
        topCard = botResult.newTopCard;
        botHand = botResult.updatedBotHand;
        
        await updateGameState(btn);
        return;
      }

      const result = await handleCardPlay(btn, playerHand, topCard);
      if (!result) return;
      
      topCard = result.newTopCard;
      playerHand = result.updatedPlayerHand;
      
      const botResult = await botTurn(btn, botHand, topCard);
      topCard = botResult.newTopCard;
      botHand = botResult.updatedBotHand;
      
      await updateGameState(btn);
    });

    async function updateGameState(interaction: ButtonInteraction) {
      const gameStatusEmbed = new EmbedBuilder()
        .setTitle('🎮 UNO - Your Move!')
        .setDescription(`🃏 Top Card: **${topCard}**\n\nYour Hand:\n${playerHand.map((c) => `• ${c}`).join('\n')}\n\n🤖 Bot has ${botHand.length} cards left.`)
        .setColor('Random');

      const updatedRows = createPlayerHandButtons(playerHand);

      if (shuffledDeck.length > 0) {
        const drawRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('draw_card')
              .setLabel('Draw Card')
              .setStyle(ButtonStyle.Primary)
          );
        updatedRows.push(drawRow);
      }

      await interaction.followUp({
        content: 'Your turn:',
        embeds: [gameStatusEmbed],
        components: updatedRows,
        ephemeral: true
      });

      if (playerHand.length === 0) {
        await interaction.followUp({
          content: '🎉 You win! The game is over.',
          ephemeral: false
        });
        collector.stop('game_over');
      } else if (botHand.length === 0) {
        await interaction.followUp({
          content: '🤖 Bot wins! The game is over.',
          ephemeral: false
        });
        collector.stop('game_over');
      } else if (shuffledDeck.length === 0) {
        await interaction.followUp({
          content: 'The deck is empty! Game ends in a draw.',
          ephemeral: false
        });
        collector.stop('game_over');
      }
    }

    collector.on('end', () => {
      interaction.editReply({
        components: []
      }).catch(console.error);
    });
  }
});