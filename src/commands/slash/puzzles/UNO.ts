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

async function botTurn(
    interaction: ButtonInteraction,
    botHand: string[],
    topCard: string
  ): Promise<{ newTopCard: string, updatedBotHand: string[] }> {
    // Wait a moment to simulate "thinking"
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Find valid cards the bot can play
    const validCards = botHand.filter(card => isValidPlay(topCard, card));
    
    if (validCards.length === 0) {
      // Draw a card if no valid moves
      const drawnCard = deck.pop()!;
      botHand.push(drawnCard);
      
      await interaction.followUp({
        content: `🤖 Bot has no valid cards and draws a card.`,
        ephemeral: false
      });
      
      // Check if drawn card can be played
      if (isValidPlay(topCard, drawnCard)) {
        // Play the drawn card if valid
        botHand.pop(); // Remove the card we just drew
        
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
    
    // Bot prioritizes which card to play based on strategy
    
    // Strategy 1: Play special cards first (especially if bot is behind)
    const specialCards = validCards.filter(card => 
      card.includes('SKIP') || card.includes('REV') || card.includes('+2') || card.includes('+4')
    );
    
    // Strategy 2: Play number cards matching the current top card color
    const matchingColorCards = validCards.filter(card => 
      parseCard(card).color === parseCard(topCard).color && !specialCards.includes(card)
    );
    
    // Strategy 3: Play number cards matching the current top card value
    const matchingValueCards = validCards.filter(card => 
      parseCard(card).value === parseCard(topCard).value && !specialCards.includes(card)
    );
    
    // Strategy 4: Play wild cards as last resort
    const wildCards = validCards.filter(card => 
      card === 'WILD' || card === '+4'
    );
    
    // Choose card based on priority
    let selectedCard: string;
    
    if (botHand.length <= 2 && specialCards.length > 0) {
      // If bot is about to win, prioritize playing special cards
      selectedCard = specialCards[0];
    } else if (matchingColorCards.length > 0) {
      // Prefer matching color cards
      selectedCard = matchingColorCards[0];
    } else if (matchingValueCards.length > 0) {
      // Then matching value cards
      selectedCard = matchingValueCards[0];
    } else if (specialCards.length > 0) {
      // Then special cards
      selectedCard = specialCards[0];
    } else {
      // Wild cards as last resort
      selectedCard = wildCards[0];
    }
    
    // Remove the selected card from bot's hand
    const cardIndex = botHand.indexOf(selectedCard);
    botHand.splice(cardIndex, 1);
    
    // Handle wild card color selection (choose most common color in hand)
    let newColor = '';
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
      
      // Find most common color
      newColor = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])[0][0];
        
      await interaction.followUp({
        content: `🤖 Bot plays: ${selectedCard}\n🤖 Bot chooses color: ${newColor}`,
        ephemeral: false
      });
      
      // For wild cards, set the new top card with the selected color
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
    let botHand = dealHand();

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
          return btn.reply({ content: 'This isn\'t your game!', ephemeral: true });
        }
      
        const result = await handleCardPlay(btn, playerHand, topCard);
        if (!result) return;
      
        topCard = result.newTopCard;
        playerHand = result.updatedPlayerHand;
      
        // Now add the bot's turn
        const botResult = await botTurn(btn, botHand, topCard);
        topCard = botResult.newTopCard;
        botHand = botResult.updatedBotHand;
      
        // Update the game status after both turns
        const gameStatusEmbed = new EmbedBuilder()
          .setTitle('🎮 UNO - Your Move!')
          .setDescription(`🃏 Top Card: **${topCard}**\n\nYour Hand:\n${playerHand.map((c) => `• ${c}`).join('\n')}\n\n🤖 Bot has ${botHand.length} cards left.`)
          .setColor('Random');
      
        // Create new button rows for the updated player hand
        const updatedRows: ActionRowBuilder<ButtonBuilder>[] = [];
        for (let i = 0; i < playerHand.length; i += 5) {
          const buttonRow = new ActionRowBuilder<ButtonBuilder>();
          const chunk = playerHand.slice(i, i + 5);
      
          const buttons = chunk.map((card) =>
            new ButtonBuilder()
              .setCustomId(`card_${card}`)
              .setLabel(card)
              .setStyle(ButtonStyle.Secondary)
          );
      
          buttonRow.addComponents(...buttons);
          updatedRows.push(buttonRow);
        }
      
        // Add a "Draw Card" button if there are enough cards left in the deck
        if (deck.length > 0) {
          const drawRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('draw_card')
                .setLabel('Draw Card')
                .setStyle(ButtonStyle.Primary)
            );
          updatedRows.push(drawRow);
        }
      
        // Send the updated game state
        await btn.followUp({
          content: 'Your turn:',
          embeds: [gameStatusEmbed],
          components: updatedRows,
          ephemeral: true
        });
      
        // Check for game end conditions
        if (playerHand.length === 0) {
          await btn.followUp({
            content: '🎉 You win! The game is over.',
            ephemeral: false
          });
          collector.stop('game_over');
        } else if (botHand.length === 0) {
          await btn.followUp({
            content: '🤖 Bot wins! The game is over.',
            ephemeral: false
          });
          collector.stop('game_over');
        } else if (deck.length === 0) {
          // Optionally end game when deck is empty, or implement reshuffling
          await btn.followUp({
            content: 'The deck is empty! Game ends in a draw.',
            ephemeral: false
          });
          collector.stop('game_over');
        }
      });
      
      // Also add handling for the "Draw Card" button
      collector.on('collect', async (btn) => {
        // Existing code...
        
        // Add this part to handle drawing cards
        if (btn.customId === 'draw_card') {
          if (deck.length === 0) {
            await btn.reply({ content: 'No cards left to draw!', ephemeral: true });
            return;
          }
          
          const drawnCard = deck.pop()!;
          playerHand.push(drawnCard);
          
          await btn.update({
            content: `You drew: ${drawnCard}`,
            components: [], // Remove current buttons
          });
          
          // Check if the drawn card can be played
          const canPlay = isValidPlay(topCard, drawnCard);
          
          const gameStatusEmbed = new EmbedBuilder()
            .setTitle('🎮 UNO - Your Move!')
            .setDescription(`🃏 Top Card: **${topCard}**\n\nYour Hand:\n${playerHand.map((c) => `• ${c}`).join('\n')}\n\n🤖 Bot has ${botHand.length} cards left.`)
            .setColor('Random');
          
          // Create new buttons for updated hand
          const updatedRows: ActionRowBuilder<ButtonBuilder>[] = [];
          for (let i = 0; i < playerHand.length; i += 5) {
            const buttonRow = new ActionRowBuilder<ButtonBuilder>();
            const chunk = playerHand.slice(i, i + 5);
        
            const buttons = chunk.map((card) =>
              new ButtonBuilder()
                .setCustomId(`card_${card}`)
                .setLabel(card)
                .setStyle(ButtonStyle.Secondary)
            );
        
            buttonRow.addComponents(...buttons);
            updatedRows.push(buttonRow);
          }
          
          await btn.followUp({
            content: canPlay ? `You drew: ${drawnCard}. You can play this card!` : `You drew: ${drawnCard}. Your turn is skipped.`,
            embeds: [gameStatusEmbed],
            components: updatedRows,
            ephemeral: true
          });
          
          // If player can't play, bot takes turn
          if (!canPlay) {
            const botResult = await botTurn(btn, botHand, topCard);
            topCard = botResult.newTopCard;
            botHand = botResult.updatedBotHand;
            
            // Update game status after bot's turn
            const newStatusEmbed = new EmbedBuilder()
              .setTitle('🎮 UNO - Your Move!')
              .setDescription(`🃏 Top Card: **${topCard}**\n\nYour Hand:\n${playerHand.map((c) => `• ${c}`).join('\n')}\n\n🤖 Bot has ${botHand.length} cards left.`)
              .setColor('Random');
            
            await btn.followUp({
              content: 'Your turn:',
              embeds: [newStatusEmbed],
              components: updatedRows,
              ephemeral: true
            });
          }
        }
      });

    collector.on('end', () => {
      // Maybe disable buttons or show a "Game over" message
    });
  }
});
