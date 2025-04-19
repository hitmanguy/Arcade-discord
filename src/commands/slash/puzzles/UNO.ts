import { RegisterType, SlashCommand } from '../../../handler';
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  ComponentType
} from 'discord.js';
 const { Game, Card } = require('unogame-js');

export default new SlashCommand({
  registerType: RegisterType.Guild,
  data: new SlashCommandBuilder()
    .setName('uno')
    .setDescription('Start a game of UNO!'),

  async execute(interaction: ChatInputCommandInteraction) {
    // Create a new game instance
    const game = new Game();
    
    // Add human player and bot
    game.addPlayer(interaction.user.id, interaction.user.username);
    game.addBot('UnoBot');

    // Start the game
    game.start();

    // Get current player's hand
    const playerHand = game.getPlayerHand(interaction.user.id);

    // Create initial game embed
    const embed = createGameEmbed(game, playerHand);

    // Create action buttons
    const actionRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('uno_draw')
          .setLabel('Draw Card')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('uno_call')
          .setLabel('Call UNO!')
          .setStyle(ButtonStyle.Secondary)
      );

    // Create card buttons
    const cardRows = createCardButtons(playerHand);

    // Send initial message
    const message = await interaction.reply({
      embeds: [embed],
      components: [...cardRows, actionRow],
      fetchReply: true
    });

    // Create collector for button interactions
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300_000 // 5 minute timeout
    });

    collector.on('collect', async (buttonInteraction) => {
      try {
        // Verify it's the current player
        if (buttonInteraction.user.id !== game.currentPlayerId) {
          await buttonInteraction.reply({
            content: "It's not your turn!",
            ephemeral: true
          });
          return;
        }

        // Handle different button actions
        if (buttonInteraction.customId === 'uno_draw') {
          await handleDrawCard(buttonInteraction, game);
        } 
        else if (buttonInteraction.customId === 'uno_call') {
          await handleCallUno(buttonInteraction, game);
        }
        else if (buttonInteraction.customId.startsWith('uno_play_')) {
          await handleCardPlay(buttonInteraction, game);
        }
        else if (buttonInteraction.customId.startsWith('uno_color_')) {
          await handleColorSelection(buttonInteraction, game);
        }

        // Update game state if not waiting for color selection
        if (!buttonInteraction.customId.startsWith('uno_color_')) {
          await updateGameMessage(buttonInteraction, game);
        }
        
        // Check if game ended
        if (game.winner) {
          await endGame(buttonInteraction, game);
          collector.stop();
        }
      } catch (error) {
        console.error('Error handling interaction:', error);
        await buttonInteraction.reply({
          content: 'An error occurred. Please try again.',
          ephemeral: true
        });
      }
    });

    collector.on('end', async () => {
      try {
        await message.edit({ components: [] });
      } catch (error) {
        console.error('Error ending game:', error);
      }
    });
  }
});

// Helper functions
function createGameEmbed(game: typeof Game, playerHand: typeof Card[]): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('🎮 UNO Game')
    .setDescription(`Current turn: <@${game.currentPlayerId}>`)
    .addFields(
      { name: '🃏 Top Card', value: formatCard(game.topCard) },
      { name: 'Your Hand', value: formatHand(playerHand) },
      { name: 'Cards Left', value: `Deck: ${game.deckCount} | Bot: ${game.getPlayerHand('UnoBot').length}` }
    )
    .setColor(getColor(game.topCard.color));
}

function formatCard(card: typeof Card): string {
  if (!card) return 'No card played yet';
  return `${getColorEmoji(card.color)} ${card.value.toUpperCase()}`;
}

function formatHand(hand: typeof Card[]): string {
  if (!hand || hand.length === 0) return 'No cards in hand';
  return hand.map(card => `• ${formatCard(card)}`).join('\n');
}

function getColor(color: string): number {
  const colors: Record<string, number> = {
    'red': 0xff0000,
    'blue': 0x0000ff,
    'green': 0x00ff00,
    'yellow': 0xffff00,
    'black': 0x000000
  };
  return colors[color.toLowerCase()] || 0xffffff;
}

function getColorEmoji(color: string): string {
  const emojis: Record<string, string> = {
    'red': '🔴',
    'blue': '🔵',
    'green': '🟢',
    'yellow': '🟡',
    'black': '⚫'
  };
  return emojis[color.toLowerCase()] || '🃏';
}

function createCardButtons(hand: typeof Card[]): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  
  if (!hand || hand.length === 0) return rows;

  // Split hand into chunks of 5 cards per row
  for (let i = 0; i < hand.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    const chunk = hand.slice(i, i + 5);
    
    chunk.forEach(card => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`uno_play_${card.id}`)
          .setLabel(`${card.value.toUpperCase()}`)
          .setStyle(getButtonStyle(card.color))
          .setDisabled(!card.canPlay)
      );
    });
    
    rows.push(row);
  }
  
  return rows;
}

function getButtonStyle(color: string): ButtonStyle {
  const styles: Record<string, ButtonStyle> = {
    'red': ButtonStyle.Danger,
    'blue': ButtonStyle.Primary,
    'green': ButtonStyle.Success,
    'yellow': ButtonStyle.Secondary,
    'black': ButtonStyle.Secondary
  };
  return styles[color.toLowerCase()] || ButtonStyle.Secondary;
}

async function handleDrawCard(interaction: ButtonInteraction, game: typeof Game) {
  const playerId = interaction.user.id;
  
  // Draw a card
  const drawnCard = game.drawCard(playerId);
  
  await interaction.reply({
    content: `You drew: ${formatCard(drawnCard)}`,
    ephemeral: true
  });
  
  // End turn after drawing
  game.nextTurn();
}

async function handleCallUno(interaction: ButtonInteraction, game: typeof Game) {
  const playerId = interaction.user.id;
  
  try {
    game.callUno(playerId);
    await interaction.reply({
      content: `UNO! <@${playerId}> has only one card left!`,
      ephemeral: false
    });
  } catch (error) {
    await interaction.reply({
      content: `You can't call UNO yet! `,
      ephemeral: true
    });
  }
}

async function handleCardPlay(interaction: ButtonInteraction, game: typeof Game) {
  const playerId = interaction.user.id;
  const cardId = interaction.customId.replace('uno_play_', '');
  
  try {
    // Play the card
    const playedCard = game.playCard(playerId, cardId);
    
    await interaction.reply({
      content: `You played ${formatCard(playedCard)}!`,
      ephemeral: true
    });
    
    // Handle special cards
    if (playedCard.value === 'skip') {
      game.nextTurn(); // Skip next player
      await interaction.followUp({
        content: `⏭️ Skipped next player!`,
        ephemeral: false
      });
    } 
    else if (playedCard.value === 'reverse') {
      await interaction.followUp({
        content: `🔄 Direction reversed!`,
        ephemeral: false
      });
    } 
    else if (playedCard.value === '+2') {
      const nextPlayer = game.nextPlayerId;
      game.drawCards(nextPlayer, 2);
      await interaction.followUp({
        content: `➕2! <@${nextPlayer}> drew 2 cards!`,
        ephemeral: false
      });
    } 
    else if (playedCard.value === 'wild+4') {
      await interaction.followUp({
        content: `🎨 Wild +4! Choose a color:`,
        components: [createColorButtons()],
        ephemeral: false
      });
      return; // Don't proceed to next turn yet
    } 
    else if (playedCard.value === 'wild') {
      await interaction.followUp({
        content: `🌈 Wild card! Choose a color:`,
        components: [createColorButtons()],
        ephemeral: false
      });
      return; // Don't proceed to next turn yet
    }
    
    // Proceed to next turn
    game.nextTurn();
  } catch (error) {
    await interaction.reply({
      content: `You can't play that card! `,
      ephemeral: true
    });
  }
}

async function handleColorSelection(interaction: ButtonInteraction, game: typeof Game) {
  const color = interaction.customId.replace('uno_color_', '');
  const playerId = interaction.user.id;
  
  try {
    game.selectColor(color);
    await interaction.update({
      content: `Color selected: ${color.toUpperCase()}`,
      components: []
    });
    
    // Handle +4 penalty after color selection
    if (game.topCard.value === 'wild+4') {
      const nextPlayer = game.nextPlayerId;
      game.drawCards(nextPlayer, 4);
      await interaction.followUp({
        content: `➕4! <@${nextPlayer}> drew 4 cards!`,
        ephemeral: false
      });
    }
    
    // Proceed to next turn
    game.nextTurn();
    await updateGameMessage(interaction, game);
  } catch (error) {
    await interaction.reply({
      content: `Error selecting color: `,
      ephemeral: true
    });
  }
}

function createColorButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('uno_color_red')
        .setLabel('Red')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('uno_color_blue')
        .setLabel('Blue')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('uno_color_green')
        .setLabel('Green')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('uno_color_yellow')
        .setLabel('Yellow')
        .setStyle(ButtonStyle.Secondary)
    );
}

async function updateGameMessage(interaction: ButtonInteraction, game: typeof Game) {
  const playerHand = game.getPlayerHand(interaction.user.id);
  
  const embed = createGameEmbed(game, playerHand);
  const cardRows = createCardButtons(playerHand);
  
  const actionRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('uno_draw')
        .setLabel('Draw Card')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('uno_call')
        .setLabel('Call UNO!')
        .setStyle(ButtonStyle.Secondary)
    );
  
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({
      embeds: [embed],
      components: [...cardRows, actionRow]
    });
  } else {
    await interaction.update({
      embeds: [embed],
      components: [...cardRows, actionRow]
    });
  }
}

async function endGame(interaction: ButtonInteraction, game: typeof Game) {
  const embed = new EmbedBuilder()
    .setTitle('🎉 Game Over!')
    .setDescription(`<@${game.winnerId}> wins the game!`)
    .addFields(
      { name: 'Final Score', value: `You: ${game.getPlayerScore(interaction.user.id)}\nBot: ${game.getPlayerScore('UnoBot')}` }
    )
    .setColor(0x00ff00);
  
  await interaction.followUp({
    embeds: [embed],
    components: []
  });
}